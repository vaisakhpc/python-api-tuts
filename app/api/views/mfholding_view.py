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

class MFHoldingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):  # Not ModelViewSet, since we return custom structure
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer, IsHoldingOwner]
    serializer_class = MFHoldingSerializer

    def get_queryset(self):
        # Optionally, only show funds with open positions; adjust as you wish
        return MFHolding.objects.filter(user=self.request.user).select_related('fund')

    def perform_create(self, serializer):
        data = serializer.validated_data
        user = self.request.user
        fund = data['fund']
        txn_type = data['type']
        units = Decimal(data['units'])
        tx_date = data['transacted_at']
        input_nav = data['nav']

        # --- NAV and Fund Existence Validation ---
        try:
            nav_obj = FundHistoricalNAV.objects.get(isin_growth=fund.isin_growth, date=tx_date)
        except FundHistoricalNAV.DoesNotExist:
            raise serializers.ValidationError(
                f"No NAV data for fund '{fund.mf_name}' (ISIN: {fund.isin_growth}) on {tx_date}. "
                "Cannot record transaction on a non-existent date."
            )

        historical_nav = nav_obj.nav
        # Allow minimal rounding error if desired (example: two decimals)
        TOLERANCE = Decimal('0.1')
        if abs(Decimal(input_nav) - Decimal(historical_nav)) > TOLERANCE:
            raise serializers.ValidationError(
                f"The supplied NAV ({input_nav}) does not match the official NAV ({historical_nav}) "
                f"for {fund.mf_name} on {tx_date}."
            )

        # --- No Oversell Validation ---
        if txn_type == 'SELL':
            qs = MFHolding.objects.filter(user=user, fund=fund)
            total_buy = qs.filter(type='BUY').aggregate(total=models.Sum('units'))['total'] or Decimal('0')
            total_sell = qs.filter(type='SELL').aggregate(total=models.Sum('units'))['total'] or Decimal('0')
            net_available = total_buy - total_sell

            if units > net_available:
                raise serializers.ValidationError(
                    f"Cannot sell {units} units: only {net_available} units currently held in {fund.mf_name}."
                )

        # --- Save the transaction ---
        serializer.save(user=user)

    def list(self, request, *args, **kwargs):
        user = request.user
        queryset = self.get_queryset().order_by('fund', 'transacted_at', 'id')

        # Group by fund
        fund_txn_map = defaultdict(list)
        for entry in queryset:
            fund_txn_map[entry.fund.id].append(entry)

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
                txn_list.append({
                    "id": t.id,
                    "type": t.type,
                    "units": float(t.units),
                    "nav": float(t.nav),
                    "transacted_at": t.transacted_at,
                })
                if t.type == 'BUY':
                    net_units += float(t.units)
                    total_bought_value += float(t.units) * float(t.nav)
                    buy_cashflows.append(-float(t.units) * float(t.nav))
                    buy_dates.append(t.transacted_at)
                elif t.type == 'SELL':
                    net_units -= float(t.units)
                    total_sold_value += float(t.units) * float(t.nav)
                    sell_cashflows.append(float(t.units) * float(t.nav))
                    sell_dates.append(t.transacted_at)

            # Net open units
            txn_base = [
                {"type": t.type, "units": float(t.units), "nav": float(t.nav), "transacted_at": t.transacted_at}
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
                amt = float(t['units']) * float(t['nav'])
                if t['type'] == 'BUY':
                    cashflows.append(-amt)
                    dates.append(t['transacted_at'])
                elif t['type'] == 'SELL':
                    cashflows.append(amt)
                    dates.append(t['transacted_at'])
            if net_units > 0 and latest_nav > 0:
                cashflows.append(current_value)
                dates.append(latest_nav_date)

            try:
                xirr_val = pyxirr_xirr(dates, cashflows)
                if xirr_val is not None:
                    xirr_val = round(xirr_val * 100, 2)
            except Exception:
                xirr_val = None

            results.append({
                "fund_id": fund.id,
                "units": net_units,
                "profit": {
                    "current_value": current_value,
                    "profit": round(profit, 2),
                    "absolute_return": round(abs_return, 2) if abs_return is not None else None,
                    "xirr": xirr_val,
                    "total_invested": total_invested,
                    "realized_redemptions": realized_redemptions,
                },
                "transactions": txn_list,
                "fund_details": MutualFundDetailSerializer(fund).data,
            })

        return Response(results, status=status.HTTP_200_OK)

