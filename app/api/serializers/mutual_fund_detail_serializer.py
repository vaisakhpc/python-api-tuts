# serializers.py
from rest_framework import serializers
from api.models import MutualFund, FundHistoricalNAV
from django.conf import settings
from datetime import timedelta, date
from api.utils.xirr import xirr
from elasticsearch import Elasticsearch, NotFoundError, ConnectionError
import logging
from api.config.es_config import NAV_INDEX_NAME

# Get a logger instance for this module
logger = logging.getLogger(__name__)


class MutualFundDetailSerializer(serializers.ModelSerializer):
    returns_xirr = serializers.SerializerMethodField()

    class Meta:
        model = MutualFund
        fields = [
            "id",
            "mf_name",
            "start_date",
            "AUM",
            "exit_load",
            "expense_ratio",
            "type",
            "isin_growth",
            "latest_nav",
            "latest_nav_date",
            "mf_schema_code",
            "returns_xirr",
        ]

    def get_returns_xirr(self, obj, from_es=True):
        """
        Fetches pre-calculated returns from Elasticsearch.
        Falls back to on-the-fly database calculation if not found in ES.
        """
        if not obj.isin_growth:
            return None
        if not from_es:
            return self._calculate_returns_from_db(obj)
        try:
            es_host = getattr(
                settings, "ELASTICSEARCH_HOST", "http://elasticsearch:9200"
            )
            es = Elasticsearch(es_host, request_timeout=5)
            index_name = NAV_INDEX_NAME

            doc = es.get(index=index_name, id=obj.isin_growth)

            return doc["_source"].get("returns", {})

        except (NotFoundError, ConnectionError) as e:
            logger.warning(
                f"Could not fetch returns from Elasticsearch for ISIN {obj.isin_growth}. "
                f"Falling back to DB calculation. Error: {e}"
            )
            # If ES fails, calculate returns from the database
            return self._calculate_returns_from_db(obj)

    def _calculate_returns_from_db(self, obj):
        """
        The original database calculation logic, used as a fallback.
        """
        if not obj.latest_nav or not obj.latest_nav_date:
            return {}

        history_records = FundHistoricalNAV.objects.filter(
            isin_growth=obj.isin_growth
        ).order_by("date")
        if not history_records:
            return {}

        latest_nav = float(obj.latest_nav)
        latest_nav_date = obj.latest_nav_date

        returns = {}
        return_windows = [
            ("xirr_6m", 182),
            ("xirr_1y", 365),
            ("xirr_3y", 1095),
            ("xirr_5y", 1825),
            ("xirr_10y", 3650),
            ("xirr_all", None),
        ]

        for key, days in return_windows:
            start_record = None
            if days is None:
                start_record = history_records.first()
            else:
                d0 = latest_nav_date - timedelta(days=days)
                for i in range(0, 31):
                    try:
                        start_record = history_records.get(
                            date=(d0 + timedelta(days=i))
                        )
                        break
                    except FundHistoricalNAV.DoesNotExist:
                        continue

            if not start_record:
                returns[key] = None
                continue

            start_nav = float(start_record.nav)
            start_date = start_record.date

            try:
                if key == "xirr_6m":
                    if start_nav > 0:
                        simple_return = ((latest_nav - start_nav) / start_nav) * 100
                        returns[key] = round(simple_return, 2)
                    else:
                        returns[key] = None
                else:
                    values = [-start_nav, latest_nav]
                    dates = [start_date, latest_nav_date]
                    rate = xirr(cashflows=values, dates=dates)
                    returns[key] = rate
            except Exception:
                returns[key] = None

        return returns
