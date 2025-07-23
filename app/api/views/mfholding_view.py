from rest_framework import viewsets, status
from rest_framework.response import Response
from api.models import MFHolding
from api.serializers.mfholding_serializer import MFHoldingSerializer
from api.serializers.mutual_fund_detail_serializer import MutualFundDetailSerializer
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer, IsHoldingOwner
from pyxirr import xirr as pyxirr_xirr  # or your own xirr function
from collections import defaultdict
from datetime import date

class MFHoldingViewSet(viewsets.ModelViewSet):
    serializer_class = MFHoldingSerializer
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer, IsHoldingOwner]

    def get_queryset(self):
        queryset = MFHolding.objects.filter(user=self.request.user)
        status = self.request.query_params.get('status')
        if status == 'closed':
            queryset = queryset.filter(sold_price__isnull=False, sold_date__isnull=False)
        elif status == 'open':
            queryset = queryset.filter(sold_price__isnull=True, sold_date__isnull=True)
        # else (no status), return all holdings
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).select_related('fund')

        # Group holdings by fund
        fund_map = defaultdict(list)
        for holding in queryset:
            fund_map[holding.fund.id].append(holding)
        
        results = []
        for fund_id, holdings in fund_map.items():
            fund = holdings[0].fund
            transactions = [{
                'holding_id': h.holding_id,
                'fund': h.fund.id if h.fund else None,
                'NAV': float(h.NAV),
                'units': float(h.units),
                'purchased_at': h.purchased_at,
                'sold_price': float(h.sold_price) if h.sold_price is not None else None,
                'sold_date': h.sold_date,
            } for h in holdings]

            # Summaries
            total_units = sum(float(h.units) for h in holdings)
            total_invested = sum(float(h.units) * float(h.NAV) for h in holdings)
            current_nav = float(fund.latest_nav) if fund.latest_nav else 0
            latest_nav_date = fund.latest_nav_date

            current_value = total_units * current_nav
            profit = current_value - total_invested
            abs_return = (profit / total_invested * 100) if total_invested else None

            # XIRR
            cashflows = [-float(h.units) * float(h.NAV) for h in holdings]
            dates = [h.purchased_at for h in holdings]
            if current_value > 0:
                cashflows.append(current_value)
                dates.append(latest_nav_date or date.today())
            try:
                xirr_val = pyxirr_xirr(dates, cashflows)
                if xirr_val is not None:
                    xirr_val = round(xirr_val * 100, 2)
            except Exception:
                xirr_val = None

            results.append({
                "fund_id": fund.id,
                "profit": {
                    "current_value": round(current_value, 2),
                    "profit": round(profit, 2),
                    "absolute_return": round(abs_return, 2) if abs_return is not None else None,
                    "xirr": xirr_val,
                    "total_invested": round(total_invested, 2),
                },
                "fund_details": MutualFundDetailSerializer(fund).data,
                "transactions": transactions,
                "units": round(total_units, 4),                
            })
        
        return Response(results, status=status.HTTP_200_OK)
