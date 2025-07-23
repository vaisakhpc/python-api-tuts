import requests
import random
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser  # restrict to admin, change as needed

from api.models import MutualFund

FUND_TYPE_CHOICES = ['Debt', 'Equity', 'Hybrid', 'Others']

class FetchMutualFundsView(APIView):
    permission_classes = [IsAdminUser]  # Only admin users allowed; adjust if needed

    def post(self, request):
        # Fetch schemes
        url = 'https://api.mfapi.in/mf'
        api_response = requests.get(url)
        funds = api_response.json()
        total_funds = len(funds)

        # Date gap calculation
        START_DATE = date(2000, 5, 29)
        END_DATE = date.today()
        total_days = (END_DATE - START_DATE).days
        gap = max(1, total_days // total_funds)

        created = 0
        skipped = 0
        skipped_isin = 0

        for idx, fund in enumerate(funds):
            # --- ONLY proceed if isinGrowth is non-empty and exists ---
            isin_growth = fund.get("isinGrowth")
            if not isin_growth or not isin_growth.strip():
                skipped_isin += 1
                continue

            mf_schema_code = int(fund['schemeCode'])
            if MutualFund.objects.filter(mf_schema_code=mf_schema_code).exists():
                skipped += 1
                continue

            mf_name = fund['schemeName']
            fund_start_date = START_DATE + timedelta(days=gap * (idx - skipped_isin - skipped))
            if fund_start_date > END_DATE:
                fund_start_date = END_DATE

            AUM = round(random.uniform(1_000, 100_000), 2)
            exit_load_value = round(random.uniform(0, 1), 2)
            exit_load = f"{exit_load_value}%"
            expense_ratio = round(random.uniform(0, 1), 2)
            type_choice = random.choice(FUND_TYPE_CHOICES)
            isin_growth = fund['isinGrowth']
            created_by_id = random.choice([1, 2])

            MutualFund.objects.create(
                mf_name=mf_name,
                mf_schema_code=mf_schema_code,
                start_date=fund_start_date,
                AUM=AUM,
                exit_load=exit_load,
                expense_ratio=expense_ratio,
                type=type_choice,
                created_by_id=created_by_id,
                isin_growth=isin_growth,
            )
            created += 1

        return Response({
            "total_funds_from_api": total_funds,
            "created": created,
            "already_existing": skipped,
            "skipped_due_to_missing_isinGrowth": skipped_isin,
        })
