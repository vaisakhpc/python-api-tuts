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
            sip_day = start_date.day
            dt = start_date

            stepup_str = request.query_params.get("stepup")
            stepup = Decimal(stepup_str) if stepup_str else Decimal("0")
            amount_for_this_step = Decimal(request.query_params.get('amount'))

            monthly_growth = []
            total_units = Decimal('0')
            invested_so_far = Decimal('0')
            sip_count = 0

            while dt <= redemption_date:
                nav = navs.filter(date__gte=dt).order_by('date').first()
                if nav:
                    nav_val = Decimal(nav.nav)
                    # Use the correct SIP amount for this month!
                    units_bought = amount_for_this_step / nav_val
                    total_units += units_bought
                    invested_so_far += amount_for_this_step

                    # For XIRR and corpus calculation, make sure to use amount_for_this_step (could differ at step-up)
                    units += units_bought
                    invested_dates.append(nav.date)
                    cashflows.append(-amount_for_this_step)
                    abs_invested += amount_for_this_step

                    corpus_val = total_units * nav_val
                    profit = corpus_val - invested_so_far

                    monthly_growth.append({
                        "date": nav.date,
                        "invested": round(float(invested_so_far), 2),
                        "corpus": round(float(corpus_val), 2),
                        "profit": round(float(profit), 2),
                        "units": round(float(total_units), 4),
                        "sip_amount": round(float(amount_for_this_step), 2),
                        "abs_return_pct": round(float(profit / invested_so_far * 100), 2) if invested_so_far else None
                    })

                # Increment to next SIP month
                sip_count += 1
                # **Apply step-up: every 12th SIP, raise for the coming year!**
                if dt.month == 12:
                    dt = dt.replace(year=dt.year + 1, month=1)
                    if stepup:
                        amount_for_this_step += round(amount_for_this_step * (stepup / 100), 2)
                else:
                    dt = dt.replace(month=dt.month + 1)
                try:
                    dt = dt.replace(day=sip_day)
                except ValueError:
                    # If the target day doesn't exist in the next month
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

        # To add the last line of current day's profit to monthly_growth
        if invest_type == 'sip' and len(monthly_growth) > 0:
            # Use all SIP units and all invested so far
            # Use the latest NAV (already in latest_nav_entry) as the "current" corpus valuation
            corpus_now = total_units * Decimal(latest_nav_entry.nav)
            profit_now = corpus_now - invested_so_far

            # Only add if latest NAV date isn't already in the list OR if "today" > last nav date
            already_includes_latest = (monthly_growth[-1]["date"] == latest_nav_entry.date)
            # Optionally, only add if today's date is not already in history
            if not already_includes_latest:
                monthly_growth.append({
                    "date": latest_nav_entry.date,  # the latest date for which you have NAV
                    "invested": round(float(invested_so_far), 2),
                    "corpus": round(float(corpus_now), 2),
                    "profit": round(float(profit_now), 2),
                    "units": round(float(total_units), 4),
                    "sip_amount": None,  # No SIP this month, just tracking value
                    "abs_return_pct": round(float(profit_now / invested_so_far * 100), 2) if invested_so_far else None
                })
        
        return Response({
            "statusCode": 200,
            "data": {
                "amount_invested": round(float(abs_invested), 2),
                "corpus_now": round(float(corpus_now), 2),
                "expected_profit": round(float(expected_profit), 2),
                "absolute_return": round(absolute_return, 2) if absolute_return is not None else None,
                "xirr": xirr_val,
                "monthly_growth": monthly_growth
            }
        })
