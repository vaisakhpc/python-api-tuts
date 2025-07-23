# serializers.py
from rest_framework import serializers
from api.models import MutualFund
from api.models import FundHistoricalNAV
from datetime import timedelta, date
from api.utils.xirr import xirr

RETURN_WINDOWS = [
    ("6M", 182), # 6 months = 182 days
    ("1Y", 365),
    ("3Y", 1095),
    ("5Y", 1825),
    ("10Y", 3650),
    ("All", None)
]

class MutualFundDetailSerializer(serializers.ModelSerializer):
    returns_xirr = serializers.SerializerMethodField()

    class Meta:
        model = MutualFund
        fields = ['id', 'mf_name', 'start_date', 'AUM', 'exit_load',
                  'expense_ratio', 'type', 'isin_growth', 'latest_nav',
                  'latest_nav_date', 'mf_schema_code', 'returns_xirr']

    def get_returns_xirr(self, obj):
        today = obj.latest_nav_date or date.today()
        isin = obj.isin_growth
        latest_nav = obj.latest_nav

        if latest_nav is None or isin is None:
            return {}

        result = {}
        for label, days in RETURN_WINDOWS:
            # "All time" special: use earliest historical NAV date
            if days is None:
                try:
                    old = FundHistoricalNAV.objects.filter(isin_growth=isin).order_by('date').first()
                except FundHistoricalNAV.DoesNotExist:
                    result[label] = None
                    continue
                if old is None or old.nav is None or old.date is None:
                    result[label] = None
                    continue
                nav0, date0 = float(old.nav), old.date
            else:
                d0 = today - timedelta(days=days)
                # Find the earliest working day >= d0 up to d0+30 days
                nav0row = None
                for i in range(0, 31):
                    day_try = d0 + timedelta(days=i)
                    nav0row = FundHistoricalNAV.objects.filter(isin_growth=isin, date=day_try).first()
                    if nav0row:
                        break
                if nav0row is None:
                    result[label] = None
                    continue
                nav0, date0 = float(nav0row.nav), nav0row.date

            # Now calculate XIRR for [-nav0, latest_nav]
            # Outflow at date0, inflow at today
            try:
                if label == "6M":
                    # Simple absolute return for 6M
                    simple_return = ((float(latest_nav) - nav0) / nav0) * 100
                    result[label] = round(simple_return, 2)
                else:
                    # XIRR for other periods (incl 'All')
                    rate = xirr(
                        cashflows=[-nav0, float(latest_nav)],
                        dates=[date0, today]
                    )
                    result[label] = rate
            except Exception:
                result[label] = None
        return result
