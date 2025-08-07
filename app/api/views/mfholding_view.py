from rest_framework import viewsets, status, serializers
from rest_framework.response import Response
from api.models import MFHolding, FundHistoricalNAV
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


class MFHoldingViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):  # Not ModelViewSet, since we return custom structure
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer, IsHoldingOwner]
    serializer_class = MFHoldingSerializer

    def get_queryset(self):
        # Optionally, only show funds with open positions; adjust as you wish
        queryset = MFHolding.objects.filter(user=self.request.user).select_related(
            "fund"
        )
        # Add filtering by fund ID if provided in the query parameters
        fund_id = self.request.query_params.get("fund")
        if fund_id:
            queryset = queryset.filter(fund_id=fund_id)

        return queryset

    def perform_create(self, serializer):
        data = serializer.validated_data
        user = self.request.user
        # --- Validate NAV and sales ---
        validate_nav_and_sales(data, data["fund"], user)
        # --- Save the transaction ---
        serializer.save(user=user)

    def list(self, request, *args, **kwargs):
        if self.request.query_params.get("fund"):
            queryset = self.get_queryset().order_by("fund", "transacted_at", "id")
            # Group by fund
            fund_txn_map = defaultdict(list)
            for entry in queryset:
                fund_txn_map[entry.fund.id].append(entry)
        else:
            # Step 1: Get distinct fund IDs for the user
            fund_ids = (
                MFHolding.objects.filter(user=self.request.user)
                .order_by("fund_id")  # Required for distinct to work properly
                .distinct("fund_id")  # Fetch distinct fund IDs
                .values_list("fund_id", flat=True)  # Extract only the fund_id field
            )

            # Step 2: Paginate the fund IDs
            paginator = StandardResultsSetPagination()
            paginated_fund_ids = paginator.paginate_queryset(
                fund_ids, request, view=self
            )
            print(f"Paginated Fund IDs: {paginated_fund_ids}")
            if not paginated_fund_ids:
                return paginator.get_paginated_response([])

            # Step 3: Fetch transactions for the paginated funds
            transactions = (
                MFHolding.objects.filter(
                    user=self.request.user, fund_id__in=paginated_fund_ids
                )
                .select_related("fund")
                .order_by("fund", "transacted_at", "id")
            )

            # Step 3: Group transactions by fund
            fund_txn_map = defaultdict(list)
            for txn in transactions:
                fund_txn_map[txn.fund.id].append(txn)

        results = []
        for fund_id, txns in fund_txn_map.items():
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

            # Net open units
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

            # 2. NAV/latest
            latest_nav = float(fund.latest_nav or 0)
            latest_nav_date = fund.latest_nav_date or date.today()
            current_value = round(net_units * latest_nav, 2)

            # 3. Profit/returns (on open units/cost)
            profit = current_value - total_invested
            abs_return = (profit / total_invested * 100) if total_invested else None

            # 4. Realized (optional, unchanged)
            realized_redemptions = round(total_sold_value, 2)

            # 5. XIRR (all cashflows, with final value as inflow)
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

        # Only validate for BUY transactionsx
        if instance.type == "BUY":
            holdings = (
                MFHolding.objects.filter(user=user, fund=fund)
                .exclude(id=instance.id)
                .values("type", "units")
            )

            buy_units = sum(h["units"] for h in holdings if h["type"] == "BUY")
            sell_units = sum(h["units"] for h in holdings if h["type"] == "SELL")

            if buy_units < sell_units:
                return Response(
                    {
                        "error": f"Cannot delete this BUY transaction. Remaining purchased units({round(buy_units)}) would be less than the total sold units({round(sell_units)}) for this fund."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
