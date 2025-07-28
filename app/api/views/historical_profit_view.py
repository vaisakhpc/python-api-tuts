from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import FundHistoricalNAV, MutualFund
from api.utils.xirr import xirr
from datetime import date, datetime, timedelta
from decimal import Decimal
from rest_framework.permissions import AllowAny

class HistoricalProfitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        isin = request.query_params.get('isin')
        start_date_str = request.query_params.get('start_date')
        amount = request.query_params.get('amount')
        invest_type = request.query_params.get('type', 'lumpsum').lower()
        today = date.today()

        if not (isin and start_date_str and amount and invest_type):
            return Response({
                "statusCode": 400,
                "errorMessage": "Missing required parameters: isin, start_date, amount, type"
            })
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            amount = Decimal(amount)
        except Exception:
            return Response({
                "statusCode": 400,
                "errorMessage": "Invalid start_date or amount."
            })

        fund = MutualFund.objects.filter(isin_growth=isin).first()
        if not fund:
            return Response({
                "statusCode": 404,
                "errorMessage": f"Mutual fund with ISIN {isin} not found."
            })

        navs = FundHistoricalNAV.objects.filter(
            isin_growth=isin, date__gte=start_date, date__lte=today
        ).order_by('date')
        if not navs.exists():
            return Response({
                "statusCode": 404,
                "errorMessage": f"No NAV data found for given fund and period."
            })

        units = Decimal('0')
        invested_dates = []
        cashflows = []
        abs_invested = Decimal('0')
        latest_nav_entry = navs.latest('date')
        redemption_date = latest_nav_entry.date

        if invest_type == 'lumpsum':
            # Invest all at first available NAV >= start date
            first_nav = navs.earliest('date')
            nav_date = first_nav.date
            nav_val = Decimal(first_nav.nav)
            units = amount / nav_val
            invested_dates.append(nav_date)
            cashflows.append(-amount)
            abs_invested = amount
        elif invest_type == 'sip':
            # Classic SIP: Outflow every month until before last NAV date; redeem all at last NAV

            # **Establish a cutoff date: The start of the redemption month.**
            # No SIPs should be processed in the same month as the final redemption.
            cutoff_date = redemption_date.replace(day=1)

            sip_day = start_date.day
            dt = start_date
            
            # Loop only for dates STRICTLY BEFORE the cutoff date.
            while dt < cutoff_date:
                # Find the first NAV for this SIP cycle on or after dt
                nav = navs.filter(date__gte=dt).order_by('date').first()
                if nav:
                    nav_val = Decimal(nav.nav)
                    units += amount / nav_val
                    invested_dates.append(nav.date)
                    cashflows.append(-amount)
                    abs_invested += amount

                # --- Month increment logic (remains the same) ---
                if dt.month == 12:
                    dt = dt.replace(year=dt.year+1, month=1)
                    stepup_str = request.query_params.get('stepup')
                    if stepup_str:
                        stepup = Decimal(stepup_str)
                        amount += round(amount * (stepup / 100), 0)
                else:
                    dt = dt.replace(month=dt.month+1)
                try:
                    dt = dt.replace(day=sip_day)
                except ValueError:
                    next_month = (dt.replace(day=1) + timedelta(days=32)).replace(day=1)
                    dt = next_month - timedelta(days=1)

        # Finally, append the final corpus inflow
        corpus_now = units * Decimal(latest_nav_entry.nav)
        cashflows.append(corpus_now)
        invested_dates.append(redemption_date)

        print([(d, cf) for d, cf in zip(invested_dates, cashflows)])
        expected_profit = corpus_now - abs_invested
        absolute_return = float((expected_profit / abs_invested * 100)) if abs_invested else None
        print([(d, cf) for d, cf in zip(invested_dates, cashflows)])
        # Calculate XIRR
        try:
            xirr_val = xirr(cashflows, invested_dates)
        except Exception:
            xirr_val = None

        return Response({
            "statusCode": 200,
            "data": {
                "amount_invested": round(float(abs_invested), 2),
                "corpus_now": round(float(corpus_now), 2),
                "expected_profit": round(float(expected_profit), 2),
                "absolute_return": round(absolute_return, 2) if absolute_return is not None else None,
                "xirr": xirr_val
            }
        })
