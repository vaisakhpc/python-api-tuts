from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from api.models import MFHolding, FundHistoricalNAV, Account
from api.serializers.mutual_fund_detail_serializer import MutualFundDetailSerializer
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer, IsHoldingOwner
from pyxirr import xirr as pyxirr_xirr
from collections import defaultdict
from datetime import date
from rest_framework import mixins
from api.serializers.mfholding_serializer import MFHoldingSerializer
from api.utils.fifo_util import fifo_cost_basis
from decimal import Decimal
from django.db import models
from django.conf import settings
from elasticsearch import Elasticsearch
from api.config.es_config import NAV_INDEX_NAME
from api.utils.holding_validator import validate_nav_and_sales
from rest_framework.pagination import PageNumberPagination
from api.pagination import StandardResultsSetPagination

allowed_fields = {"units", "nav", "transacted_at"}


class MFHoldingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    # Not ModelViewSet, since we return custom structure
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer, IsHoldingOwner]
    serializer_class = MFHoldingSerializer

    def create(self, request, *args, **kwargs):
        identifier_type = request.data.get("identifier", "id")
        identifier_value = request.data.get("fund")
        fund_model = MFHolding._meta.get_field('fund').related_model
        fund = None
        if identifier_type in ["id", "", None]:
            fund = fund_model.objects.filter(id=identifier_value).first()
        elif identifier_type == "scheme":
            fund = fund_model.objects.filter(mf_schema_code=identifier_value).first()
        elif identifier_type == "isin":
            fund = fund_model.objects.filter(isin_growth=identifier_value).first()
        if not fund:
            return Response({"statusCode": 400, "errorMessage": f"Fund not found for {identifier_type}: {identifier_value}"}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data["fund"] = fund.id
        # Resolve account: use provided account if belongs to user; else use primary
        acc_id = request.data.get("account")
        account = None
        if acc_id:
            account = Account.objects.filter(id=acc_id, user=request.user).first()
        if not account:
            account = Account.objects.filter(user=request.user, is_primary=True).first()
            # If user has no accounts, auto-create a primary account
            if not account:
                account = Account.objects.create(user=request.user, name="Primary", is_primary=True)
        data["account"] = account.id if account else None
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({"statusCode": 201, "data": serializer.data}, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        queryset = MFHolding.objects.filter(user=self.request.user).select_related("fund", "account")
        fund_id = self.request.query_params.get("fund")
        account_id = self.request.query_params.get("account")
        if fund_id:
            queryset = queryset.filter(fund_id=fund_id)
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        return queryset

    def perform_create(self, serializer):
        data = serializer.validated_data
        user = self.request.user
        fund = data["fund"]
        # --- Validate NAV and sales ---
        validate_nav_and_sales(data, fund, user)
        # --- Save the transaction ---
        serializer.save(user=user)

    def list(self, request, *args, **kwargs):
        fund_id = self.request.query_params.get("fund")
        account_id = self.request.query_params.get("account")
        base_qs = MFHolding.objects.filter(user=self.request.user).select_related("fund").order_by("fund", "transacted_at", "id")
        if fund_id:
            base_qs = base_qs.filter(fund_id=fund_id)
        if account_id:
            base_qs = base_qs.filter(account_id=account_id)
        transactions = list(base_qs)

        fund_txn_map = defaultdict(list)
        for txn in transactions:
            fund_txn_map[txn.fund.id].append(txn)

        results = []
        for fund_key, txns in fund_txn_map.items():
            fund = txns[0].fund
            txn_list = []
            net_units = 0
            total_bought_value = 0
            total_sold_value = 0
            buy_cashflows, buy_dates = [], []
            sell_cashflows, sell_dates = [], []

            for t in txns:
                txn_list.append(
                    {
                        "id": t.id,
                        "type": t.type,
                        "units": float(t.units),
                        "nav": float(t.nav),
                        "transacted_at": t.transacted_at,
                    }
                )
                if t.type == "BUY":
                    net_units += float(t.units)
                    total_bought_value += float(t.units) * float(t.nav)
                    buy_cashflows.append(-float(t.units) * float(t.nav))
                    buy_dates.append(t.transacted_at)
                elif t.type == "SELL":
                    net_units -= float(t.units)
                    total_sold_value += float(t.units) * float(t.nav)
                    sell_cashflows.append(float(t.units) * float(t.nav))
                    sell_dates.append(t.transacted_at)

            txn_base = [
                {
                    "type": t.type,
                    "units": float(t.units),
                    "nav": float(t.nav),
                    "transacted_at": t.transacted_at,
                }
                for t in txns
            ]
            total_invested, net_units = fifo_cost_basis(txn_base)
            total_invested = round(total_invested, 2)
            net_units = round(net_units, 4)

            latest_nav = float(fund.latest_nav or 0)
            latest_nav_date = fund.latest_nav_date or date.today()
            current_value = round(net_units * latest_nav, 2)

            profit = current_value - total_invested
            abs_return = (profit / total_invested * 100) if total_invested else None
            realized_redemptions = round(total_sold_value, 2)

            cashflows = []
            dates = []
            for t in txn_base:
                amt = float(t["units"]) * float(t["nav"])
                if t["type"] == "BUY":
                    cashflows.append(-amt)
                    dates.append(t["transacted_at"])
                elif t["type"] == "SELL":
                    cashflows.append(amt)
                    dates.append(t["transacted_at"])
            if net_units > 0 and latest_nav > 0:
                cashflows.append(current_value)
                dates.append(latest_nav_date)

            try:
                xirr_val = pyxirr_xirr(dates, cashflows)
                if xirr_val is not None:
                    xirr_val = round(xirr_val * 100, 2)
            except Exception:
                xirr_val = None

            results.append(
                {
                    "fund_id": fund.id,
                    "units": net_units,
                    "profit": {
                        "current_value": current_value,
                        "profit": round(profit, 2),
                        "absolute_return": (
                            round(abs_return, 2) if abs_return is not None else None
                        ),
                        "xirr": xirr_val,
                        "total_invested": total_invested,
                        "realized_redemptions": realized_redemptions,
                    },
                    "fund_details": MutualFundDetailSerializer(fund).data,
                    "transactions": txn_list,
                }
            )

        if fund_id:
            return Response(results, status=status.HTTP_200_OK)
        
        # Only sort if not filtering by fund
        order_by = request.query_params.get("order_by", "profit.current_value")
        order_dir = request.query_params.get("order_dir", "desc")
        def get_sort_key(item):
            keys = order_by.split('.')
            value = item
            for k in keys:
                value = value.get(k) if isinstance(value, dict) else None
            return value if value is not None else 0
        results.sort(key=get_sort_key, reverse=(order_dir == "desc"))

        return Response(results, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        # Filter request.data to only allowed fields
        requested_fields = set(request.data.keys())
        non_editable_fields = requested_fields - allowed_fields

        filtered_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        instance = self.get_object()
        serializer = self.get_serializer(instance, data=filtered_data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Merge fields for validation
        data = serializer.validated_data.copy()
        for field in ["fund", "type", "units", "transacted_at", "nav"]:
            if field not in serializer.validated_data:
                data[field] = getattr(instance, field)

        fund = data["fund"]
        validate_nav_and_sales(data, fund, self.request.user, instance=instance)

        serializer.save(user=self.request.user)
        response_data = serializer.data
        if non_editable_fields:
            response_data[
                "message"
            ] = f"The following fields are not editable and were ignored: {', '.join(non_editable_fields)}"

        return Response(response_data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        fund = instance.fund
        user = instance.user
        account_id = getattr(instance, "account_id", None)

        # Only validate for BUY transactions
        if instance.type == "BUY":
            base_qs = MFHolding.objects.filter(user=user, fund=fund)
            if account_id is not None:
                base_qs = base_qs.filter(account_id=account_id)
            holdings = base_qs.exclude(id=instance.id).values("type", "units")

            buy_units = sum(h["units"] for h in holdings if h["type"] == "BUY")
            sell_units = sum(h["units"] for h in holdings if h["type"] == "SELL")

            if buy_units < sell_units:
                return Response(
                    {
                        "statusCode": 400,
                        "errorMessage": (
                            f"Cannot delete this BUY transaction. Remaining purchased units({round(buy_units)}) "
                            f"would be less than the total sold units({round(sell_units)}) for this fund"
                            + (f" in account '{getattr(instance.account, 'name', 'selected account')}'" if account_id is not None else "")
                            + "."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["delete"], url_path="purge")
    def purge(self, request, *args, **kwargs):
        """
        Delete all transactions for the authenticated user.
        Optional query param `fund` can be provided to delete only that fund's transactions.

        Examples:
        - DELETE /api/mfholdings/purge/                 -> deletes all user's transactions
        - DELETE /api/mfholdings/purge/?fund=123        -> deletes all user's transactions for fund 123
        """
        fund_id_param = request.query_params.get("fund")
        account_id_param = request.query_params.get("account")
        qs = MFHolding.objects.filter(user=request.user)

        scope = "all"
        fund_id_val = None
        account_id_val = None
        if fund_id_param is not None and str(fund_id_param).strip() != "":
            try:
                fund_id_val = int(fund_id_param)
                qs = qs.filter(fund_id=fund_id_val)
                scope = "fund"
            except ValueError:
                return Response(
                    {"statusCode": 400, "errorMessage": "Invalid fund id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if account_id_param is not None and str(account_id_param).strip() != "":
            try:
                account_id_val = int(account_id_param)
                qs = qs.filter(account_id=account_id_val)
                scope = "account" if scope == "all" else "fund_account"
            except ValueError:
                return Response(
                    {"statusCode": 400, "errorMessage": "Invalid account id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Perform bulk delete; returns (num_deleted, details)
        deleted_count, _ = qs.delete()

        # If delete requested with filters and nothing was deleted, treat as bad request
        if scope != "all" and deleted_count == 0:
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": "No transactions found for the given filters.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "statusCode": 200,
                "data": {
                    "deleted": deleted_count,
                    "scope": scope,
                    "fund_id": fund_id_val,
                    "account_id": account_id_val,
                },
            },
            status=status.HTTP_200_OK,
        )
