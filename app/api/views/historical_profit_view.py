from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import FundHistoricalNAV, MutualFund
from api.utils.xirr import xirr
from api.utils.capital_gains import calculate_equity_capital_gains
from datetime import date, datetime, timedelta
from decimal import Decimal
from rest_framework.permissions import AllowAny
from django.conf import settings
from elasticsearch import Elasticsearch, NotFoundError, ConnectionError
import traceback
from api.config.es_config import MUTUALFUND_INDEX_NAME, NAV_INDEX_NAME
from api.serializers.mutual_fund_serializer import MutualFundSerializer
import logging


class HistoricalProfitView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        isin = request.query_params.get("isin")
        start_date_str = request.query_params.get("start_date")
        amount = request.query_params.get("amount")
        invest_type = request.query_params.get("type", "lumpsum").lower()
        today = date.today()
        # Set up logging
        logger = logging.getLogger(__name__)

        if not (isin and start_date_str and amount and invest_type):
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": "Missing required parameters: isin, start_date, amount, type",
                }
            )
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            amount = Decimal(amount)
        except Exception:
            return Response(
                {"statusCode": 400, "errorMessage": "Invalid start_date or amount."}
            )

        # Try to fetch fund details from Elasticsearch first
        fund = None
        es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://localhost:9200")
        es = Elasticsearch(es_host)
        try:
            es_query = {"query": {"term": {"isin": isin}}}
            es_response = es.search(index=MUTUALFUND_INDEX_NAME, body=es_query, size=1)
            hits = es_response["hits"]["hits"]
            if hits:
                fund_data = hits[0]["_source"]

                # Mimic the Django model instance for required fields
                class FundObj:
                    pass

                fund = FundObj()
                fund.latest_nav_date = datetime.strptime(
                    fund_data.get("latest_nav_date"), "%Y-%m-%d"
                ).date()
                fund.latest_nav = fund_data.get("latest_nav")
                fund.type = fund_data.get("type", "")
                fund.isin_growth = fund_data.get("isin")
        except Exception as e:
            logger.warning(
                f"Error during Elasticsearch search from fund list: {e}. Traceback: {traceback.format_exc()}"
            )
            fund = None

        # Fallback to database if ES fails or returns no data
        if not fund:
            fund = MutualFund.objects.filter(isin_growth=isin).first()
        if not fund:
            return Response(
                {
                    "statusCode": 404,
                    "errorMessage": f"Mutual fund with ISIN {isin} not found.",
                }
            )
        # Serialize fund_data if it's a MutualFund instance
        if isinstance(fund, MutualFund):
            fund_data = MutualFundSerializer(fund).data
        if not fund.latest_nav_date or not fund.latest_nav:
            return Response(
                {
                    "statusCode": 404,
                    "errorMessage": "Latest NAV data not available on fund",
                }
            )

        # Try to fetch NAVs from Elasticsearch first
        navs = []
        es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://localhost:9200")
        es = Elasticsearch(es_host)
        try:
            es_query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"isin": isin}},
                            {
                                "range": {
                                    "date": {
                                        "gte": start_date_str,
                                        "lte": today.strftime("%Y-%m-%d"),
                                    }
                                }
                            },
                        ]
                    }
                },
                "sort": [{"date": {"order": "asc"}}],
            }
            es_response = es.search(index=NAV_INDEX_NAME, body=es_query, size=10000)
            navs = [
                {
                    "date": datetime.strptime(
                        hit["_source"]["date"], "%Y-%m-%d"
                    ).date(),
                    "nav": Decimal(str(hit["_source"]["nav"])),
                }
                for hit in es_response["hits"]["hits"]
            ]

        except (NotFoundError, ConnectionError, Exception) as e:
            logger.warning(
                f"Error fetching NAVs from Elasticsearch: {e}. Traceback: {traceback.format_exc()}"
            )
            navs = None

        # Fallback to database if ES fails or returns no data
        if not navs:
            db_navs = FundHistoricalNAV.objects.filter(
                isin_growth=isin, date__gte=start_date, date__lte=today
            ).order_by("date")
            if not db_navs.exists():
                return Response(
                    {
                        "statusCode": 404,
                        "errorMessage": f"No NAV data found for given fund and period.",
                    }
                )
            navs = [{"date": nav.date, "nav": Decimal(nav.nav)} for nav in db_navs]

        units = Decimal("0")
        invested_dates = []
        cashflows = []
        abs_invested = Decimal("0")
        redemption_date = fund.latest_nav_date
        monthly_growth = []

        if invest_type == "lumpsum":
            # Invest all at first available NAV >= start date
            if isinstance(navs, list):  # Handle the case where navs is a list
                first_nav = min(navs, key=lambda x: x["date"])
            else:  # Handle the case where navs is a QuerySet
                first_nav = navs.earliest("date")
            nav_date = first_nav["date"] if isinstance(first_nav, dict) else first_nav.date
            nav_val = first_nav["nav"] if isinstance(first_nav, dict) else Decimal(first_nav.nav)
            units = amount / nav_val
            invested_dates.append(nav_date)
            cashflows.append(-amount)
            abs_invested = amount
        elif invest_type == "sip":
            sip_day = start_date.day
            dt = start_date

            stepup_str = request.query_params.get("stepup")
            stepup = Decimal(stepup_str) if stepup_str else Decimal("0")
            amount_for_this_step = Decimal(request.query_params.get("amount"))

            total_units = Decimal("0")
            invested_so_far = Decimal("0")
            sip_count = 0

            while dt <= redemption_date:
                nav = next((n for n in navs if n["date"] >= dt), None)
                if nav:
                    nav_val = nav["nav"]
                    # Use the correct SIP amount for this month!
                    units_bought = amount_for_this_step / nav_val
                    total_units += units_bought
                    invested_so_far += amount_for_this_step

                    # For XIRR and corpus calculation, make sure to use amount_for_this_step (could differ at step-up)
                    units += units_bought
                    invested_dates.append(nav["date"])
                    cashflows.append(-amount_for_this_step)
                    abs_invested += amount_for_this_step

                    corpus_val = total_units * nav_val
                    profit = corpus_val - invested_so_far

                    monthly_growth.append(
                        {
                            "date": nav["date"],
                            "invested": round(float(invested_so_far), 2),
                            "corpus": round(float(corpus_val), 2),
                            "profit": round(float(profit), 2),
                            "units": round(float(total_units), 4),
                            "sip_amount": round(float(amount_for_this_step), 2),
                            "abs_return_pct": (
                                round(float(profit / invested_so_far * 100), 2)
                                if invested_so_far
                                else None
                            ),
                        }
                    )

                # Increment to next SIP month
                sip_count += 1
                # **Apply step-up: every 12th SIP, raise for the coming year!**
                if dt.month == 12:
                    dt = dt.replace(year=dt.year + 1, month=1)
                    if stepup:
                        amount_for_this_step += round(
                            amount_for_this_step * (stepup / 100), 2
                        )
                else:
                    dt = dt.replace(month=dt.month + 1)
                try:
                    dt = dt.replace(day=sip_day)
                except ValueError:
                    # If the target day doesn't exist in the next month
                    next_month = (dt.replace(day=1) + timedelta(days=32)).replace(day=1)
                    dt = next_month - timedelta(days=1)

        # Finally, append the final corpus inflow
        corpus_now = units * Decimal(fund.latest_nav)
        cashflows.append(corpus_now)
        invested_dates.append(redemption_date)

        expected_profit = corpus_now - abs_invested
        absolute_return = (
            float((expected_profit / abs_invested * 100)) if abs_invested else None
        )

        # Calculate XIRR
        try:
            xirr_val = xirr(cashflows, invested_dates)
        except Exception as e:
            logger.warning(f"XIRR calculation failed: {traceback.format_exc()}")
            xirr_val = None

        # To add the last line of current day's profit to monthly_growth
        if invest_type == "sip" and len(monthly_growth) > 0:
            # Use all SIP units and all invested so far
            # Use the latest NAV (already in latest_nav_entry) as the "current" corpus valuation
            corpus_now = total_units * Decimal(fund.latest_nav)
            profit_now = corpus_now - invested_so_far

            # Only add if latest NAV date isn't already in the list OR if "today" > last nav date
            already_includes_latest = monthly_growth[-1]["date"] == fund.latest_nav_date
            # Optionally, only add if today's date is not already in history
            if not already_includes_latest:
                monthly_growth.append(
                    {
                        "date": fund.latest_nav_date,  # the latest date for which you have NAV
                        "invested": round(float(invested_so_far), 2),
                        "corpus": round(float(corpus_now), 2),
                        "profit": round(float(profit_now), 2),
                        "units": round(float(total_units), 4),
                        "sip_amount": None,  # No SIP this month, just tracking value
                        "abs_return_pct": (
                            round(float(profit_now / invested_so_far * 100), 2)
                            if invested_so_far
                            else None
                        ),
                    }
                )

        tax_results = {}
        # Apply Capital gains
        if "equity" in fund.type.lower():
            purchase_records = []
            # Example build purchase_records from your SIP logic:
            for d, cf in zip(invested_dates, cashflows):
                if cf < 0:  # Purchase cash flow
                    nav_val = next((n["nav"] for n in navs if n["date"] == d), None)
                    units_bought = -(cf) / nav_val if nav_val else Decimal("0")
                    purchase_records.append(
                        {
                            "units": units_bought,
                            "purchase_date": d,
                            "purchase_nav": nav_val,
                            "amount": -cf,
                        }
                    )

            tax_results = calculate_equity_capital_gains(
                fund, purchase_records, sell_date=None
            )

        return Response(
            {
                "statusCode": 200,
                "data": {
                    "amount_invested": round(float(abs_invested), 2),
                    "corpus_now": round(float(corpus_now), 2),
                    "expected_profit": round(float(expected_profit), 2),
                    "absolute_return": (
                        round(absolute_return, 2)
                        if absolute_return is not None
                        else None
                    ),
                    "xirr": xirr_val,
                    "monthly_growth": monthly_growth,
                    "tax_results": tax_results,
                    "fund_details": fund_data,
                },
            }
        )
