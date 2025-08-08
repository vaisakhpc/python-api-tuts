from decimal import Decimal
from rest_framework import serializers
from django.conf import settings
from elasticsearch import Elasticsearch
from api.models import FundHistoricalNAV, MFHolding
from api.config.es_config import NAV_INDEX_NAME
from django.db import models


def fetch_nav_from_es_or_db(fund, tx_date):
    es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://localhost:9200")
    es = Elasticsearch(es_host)
    nav_obj = None
    try:
        es_query = {
            "query": {
                "bool": {
                    "must": [
                        {"term": {"isin": fund.isin_growth}},
                        {
                            "nested": {
                                "path": "history",
                                "query": {
                                    "bool": {
                                        "must": [
                                            {
                                                "term": {
                                                    "history.date": tx_date.strftime(
                                                        "%Y-%m-%d"
                                                    )
                                                }
                                            }
                                        ]
                                    }
                                },
                            }
                        },
                    ]
                }
            }
        }
        es_response = es.search(index=NAV_INDEX_NAME, body=es_query, size=1)
        hits = es_response["hits"]["hits"]
        if hits:
            history_list = hits[0]["_source"].get("history", [])
            date_str = tx_date.strftime("%Y-%m-%d")
            nav_data = next((h for h in history_list if h["date"] == date_str), None)
            if nav_data:
                nav_obj = type("NavObj", (), {})()
                nav_obj.nav = nav_data.get("nav")
                nav_obj.date = nav_data.get("date")
    except Exception as e:
        print(f"Error fetching NAV from Elasticsearch: {e}")
        nav_obj = None

    # Fallback to DB if ES fails or not found
    if not nav_obj:
        try:
            nav_obj = FundHistoricalNAV.objects.get(
                isin_growth=fund.isin_growth, date=tx_date
            )
        except FundHistoricalNAV.DoesNotExist:
            raise serializers.ValidationError(
                f"No NAV data for fund '{getattr(fund, 'mf_name', '')}' (ISIN: {fund.isin_growth}) on {tx_date}. "
                "Cannot record transaction on a non-existent date."
            )
    return nav_obj


def validate_nav_and_sales(data, fund, user, instance=None):
    input_nav = Decimal(data["nav"])
    tx_date = data["transacted_at"]
    units = Decimal(data["units"])
    txn_type = data["type"]

    # NAV validation
    nav_obj = fetch_nav_from_es_or_db(fund, tx_date)
    historical_nav = Decimal(nav_obj.nav)
    TOLERANCE = Decimal("0.1")
    if abs(input_nav - historical_nav) > TOLERANCE:
        raise serializers.ValidationError(
            f"The supplied NAV ({input_nav}) does not match the official NAV ({historical_nav}) "
            f"for {getattr(fund, 'mf_name', '')} on {tx_date}."
        )

    # Negative sales validation
    if txn_type == "SELL":
        qs = MFHolding.objects.filter(user=user, fund=fund)
        total_buy = qs.filter(type="BUY").aggregate(total=models.Sum("units"))[
            "total"
        ] or Decimal("0")
        total_sell = qs.filter(type="SELL").aggregate(total=models.Sum("units"))[
            "total"
        ] or Decimal("0")
        net_available = total_buy - total_sell

        if units > net_available:
            raise serializers.ValidationError(
                f"Cannot sell {units} units: only {net_available} units currently held in {fund.mf_name}."
            )
