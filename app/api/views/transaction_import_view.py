# api/views/import_transactions.py
import csv
import io
import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.db import transaction
from api.models import MFHolding
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer

from api.utils.transaction_import import (
    process_kuvera_transactions,
    clean_csv_rows,
    process_self_transactions,
)

# Later: import process_self_transactions, etc.

# Required CSV columns per import type
REQUIRED_COLUMNS = {
    # Kuvera export expected headers (after stripping):
    # Date, Name of the Fund, Order, Units, NAV
    "kuvera": {"Date", "Name of the Fund", "Order", "Units", "NAV"},
    # Self: placeholder for now — mapping-based import handles this later
    # Keep empty set to skip header check for self at this stage
    "self": set(),
}


def validate_required_columns(rows, required_columns):
    """
    Validate that the CSV rows contain all required header columns.
    Returns (is_valid: bool, missing: list[str], no_rows: bool)
    """
    if not required_columns:
        return True, [], False
    if not rows:
        # No data rows present
        return False, sorted(list(required_columns)), True
    headers = set(rows[0].keys())
    missing = [c for c in required_columns if c not in headers]
    return (len(missing) == 0), missing, False


class TransactionImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer]

    def post(self, request, *args, **kwargs):
        import_type = request.query_params.get("type")
        # Accept either 'transactions' or 'file' as the upload field name
        csv_file = request.FILES.get("transactions") or request.FILES.get("file")
        # Optional account id to attach imported holdings to
        account_param = request.query_params.get("account")
        try:
            account_id = int(account_param) if account_param is not None else None
        except ValueError:
            return Response(
                {"statusCode": 400, "errorMessage": "Invalid account id in query param."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if import_type not in ("self", "kuvera"):
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": "Invalid or missing 'type' parameter. Supported: 'self', 'kuvera'.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not csv_file:
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": "No CSV file uploaded. Use field name 'file' or 'transactions'.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            rows = clean_csv_rows(csv_file)
        except Exception as e:
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": f"Failed to read CSV file: {str(e)}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate required columns by type
        required = REQUIRED_COLUMNS.get(import_type, set())
        ok, missing, no_rows = validate_required_columns(rows, required)
        if not ok:
            if no_rows:
                return Response(
                    {
                        "statusCode": 400,
                        "errorMessage": "CSV file contains no data rows to import.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": f"CSV missing columns required for {import_type}: {missing}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if import_type == "kuvera":
            errors, new_holdings = process_kuvera_transactions(request.user, rows, account_id)
            if errors:
                # Flatten errors to a single errorMessage for consistency
                msg = "; ".join(errors)
                return Response(
                    {"statusCode": 400, "errorMessage": msg},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            with transaction.atomic():
                MFHolding.objects.bulk_create(new_holdings)
            return Response(
                {"statusCode": 200, "data": {"message": f"Imported {len(new_holdings)} transactions.", "statusCode": 200}}
            )

        elif import_type == "self":
            column_map_raw = request.data.get("column_map")
            try:
                column_map = json.loads(column_map_raw)
            except Exception as e:
                return Response(
                    {"statusCode": 400, "errorMessage": f"Invalid/missing column_map JSON: {e}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Make sure to use your CSV cleaning as you did above to get rows
            # Assume 'rows' is the list of cleaned dicts (headers and values stripped)
            errors, new_holdings = process_self_transactions(
                request.user, rows, column_map, account_id
            )
            if errors:
                msg = "; ".join(errors)
                return Response({"statusCode": 400, "errorMessage": msg}, status=400)
            with transaction.atomic():
                MFHolding.objects.bulk_create(new_holdings)
            return Response(
                {"statusCode": 200, "data": {"message": f"Imported {len(new_holdings)} transactions.", "statusCode": 200}}
            )
