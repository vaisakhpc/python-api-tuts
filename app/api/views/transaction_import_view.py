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

from api.utils.transaction_import import process_kuvera_transactions, clean_csv_rows, process_self_transactions
# Later: import process_self_transactions, etc.

class TransactionImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer]
    
    def post(self, request, *args, **kwargs):
        import_type = request.query_params.get('type')
        csv_file = request.FILES.get('transactions')

        if import_type not in ('self', 'kuvera'):
            return Response(
                {"error": "Invalid or missing 'type' parameter. Supported: 'self', 'kuvera'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not csv_file:
            return Response(
                {"error": "No CSV file uploaded with key 'transactions'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            rows = clean_csv_rows(request.FILES.get('transactions'))
        except Exception as e:
            return Response(
                {"error": f"Failed to read CSV file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST
            )

        if import_type == 'kuvera':
            errors, new_holdings = process_kuvera_transactions(request.user, rows)
            if errors:
                return Response({
                    "statusCode": 400, "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
            with transaction.atomic():
                MFHolding.objects.bulk_create(new_holdings)
            return Response({
                "message": f"Imported {len(new_holdings)} transactions.",
                "statusCode": 200,
            })

        elif import_type == 'self':
            column_map_raw = request.data.get('column_map')
            try:
                column_map = json.loads(column_map_raw)
            except Exception as e:
                return Response({"error": f"Invalid/missing column_map JSON: {e}"}, 400)
            # Make sure to use your CSV cleaning as you did above to get rows
            # Assume 'rows' is the list of cleaned dicts (headers and values stripped)
            errors, new_holdings = process_self_transactions(request.user, rows, column_map)
            if errors:
                return Response({"statusCode": 400, "errors": errors}, status=400)
            with transaction.atomic():
                MFHolding.objects.bulk_create(new_holdings)
            return Response({
                "message": f"Imported {len(new_holdings)} transactions.",
                "statusCode": 200
            })
