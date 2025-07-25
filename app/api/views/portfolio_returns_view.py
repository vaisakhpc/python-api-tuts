from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import MFHolding
from api.utils.xirr import xirr
from datetime import date as dt_date
from datetime import timedelta
from django.utils import timezone

class PortfolioReturnsView(APIView):
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer]

    def get(self, request):
        ten_days_ago = timezone.localdate() - timedelta(days=10)
        user = request.user
        holdings = MFHolding.objects.filter(
            user=user,
            sold_price__isnull=True,
            sold_date__isnull=True,
            fund__latest_nav_date__gte=ten_days_ago  # Only include funds updated within last 10 days
        ).select_related('fund')
        total_invested = 0
        current_value = 0
        cashflows = []
        dates = []

        for h in holdings:
            units = float(h.units)
            nav_bought = float(h.NAV)
            fund = h.fund
            if not fund or not fund.latest_nav or not fund.latest_nav_date:
                continue
            invested = units * nav_bought
            total_invested += invested
            cashflows.append(-invested)
            dates.append(h.purchased_at)
            current_value += units * float(fund.latest_nav)

        # Only add to cashflows if there’s at least one valid holding
        if current_value > 0 and len(cashflows) > 0:
            latest_date = max(
                [h.fund.latest_nav_date for h in holdings if h.fund and h.fund.latest_nav_date],
                default=None
            )
            if not latest_date:
                latest_date = dt_date.today()
            cashflows.append(current_value)
            dates.append(latest_date)

        profit = current_value - total_invested  # <-- Make sure this comes AFTER total_invested and current_value are computed
        absolute_return = (profit / total_invested * 100) if total_invested else None

        try:
            xirr_val = xirr(cashflows, dates)
        except Exception as e:
            xirr_val = None

        return Response({
            "total_invested": round(total_invested, 2),
            "current_value": round(current_value, 2),
            "profit": round(profit, 2),
            "absolute_return": round(absolute_return, 2) if absolute_return is not None else None,
            "xirr": xirr_val
        })
        user = request.user
        holdings = MFHolding.objects.filter(
            user=user,
            sold_price__isnull=True,
            sold_date__isnull=True
        ).select_related('fund')

        total_invested = 0
        cashflows = []
        dates = []
        current_value = 0
        for h in holdings:
            units = float(h.units)
            nav_bought = float(h.NAV)
            fund = h.fund
            if not fund or not fund.latest_nav or not fund.latest_nav_date:
                continue
            invested = units * nav_bought
            # Outflow on the purchase date
            cashflows.append(-invested)
            dates.append(h.purchased_at)
            # Sum up current value for all holdings
            current_value += units * float(fund.latest_nav)

        # Use the latest NAV date among all holdings for the inflow
        if current_value > 0:
            latest_date = max([h.fund.latest_nav_date for h in holdings if h.fund and h.fund.latest_nav_date], default=None)
            from datetime import date as dt_date
            if not latest_date:
                latest_date = dt_date.today()
            cashflows.append(current_value)
            dates.append(latest_date)

        error_msg = None
        
        profit = current_value - total_invested  # <-- Make sure this comes AFTER total_invested and current_value are computed
        absolute_return = (profit / total_invested * 100) if total_invested else None
        
        try:
            xirr_val = xirr(cashflows, dates)
        except Exception:
            error_msg = f"XIRR calculation error: {e}. Cashflows: {cashflows} Dates: {dates}"
            xirr_val = None


        return Response({
            "total_invested": round(total_invested, 2),
            "current_value": round(current_value, 2),
            "profit": round(profit, 2),
            "absolute_return": round(absolute_return, 2) if absolute_return is not None else None,
            "xirr": xirr_val,
            "xirr_error": error_msg
        })
