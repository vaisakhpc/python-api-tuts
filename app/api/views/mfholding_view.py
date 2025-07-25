from rest_framework import viewsets, status
from rest_framework.response import Response
from api.models import MFHolding
from api.serializers.mutual_fund_detail_serializer import MutualFundDetailSerializer
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer, IsHoldingOwner
from pyxirr import xirr as pyxirr_xirr
from collections import defaultdict
from datetime import date
from rest_framework import mixins
from api.serializers.mfholding_serializer import MFHoldingSerializer

class MFHoldingViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):  # Not ModelViewSet, since we return custom structure
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer, IsHoldingOwner]
    serializer_class = MFHoldingSerializer

    def get_queryset(self):
        # Optionally, only show funds with open positions; adjust as you wish
        return MFHolding.objects.filter(user=self.request.user).select_related('fund')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
            net_units = round(net_units, 4)
            latest_nav = float(fund.latest_nav or 0)
            latest_nav_date = fund.latest_nav_date or date.today()
            current_value = round(net_units * latest_nav, 2)

            # Prepare cashflows/dates for XIRR: all buys (negative), all sells (positive), plus any open units as inflow today
            cashflows = buy_cashflows + sell_cashflows
            dates = buy_dates + sell_dates
            if net_units > 0 and latest_nav > 0:
                cashflows.append(current_value)
                dates.append(latest_nav_date)

            # Invested is true cost basis, great for simple reporting (for FIFO realized profit, use extra logic)
            total_invested = round(total_bought_value, 2)
            realized_redemptions = round(total_sold_value, 2)  # sum of all sales so far
            profit = current_value + total_sold_value - total_invested
            abs_return = (profit / total_invested * 100) if total_invested else None

            try:
                xirr_val = pyxirr_xirr(dates, cashflows)
                if xirr_val is not None:
                    xirr_val = round(xirr_val * 100, 2)
            except Exception:
                xirr_val = None

            results.append({
                "fund_id": fund.id,
                "profit": {
                    "current_value": current_value,
                    "profit": round(profit, 2),
                    "absolute_return": round(abs_return, 2) if abs_return is not None else None,
                    "xirr": xirr_val,
                    "total_invested": total_invested,
                    "realized_redemptions": realized_redemptions,
                },
                "fund_details": MutualFundDetailSerializer(fund).data,
                "transactions": txn_list,
                "units": net_units,
            })

        return Response(results, status=status.HTTP_200_OK)
