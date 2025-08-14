from decimal import Decimal
from rest_framework import serializers
from django.conf import settings
from elasticsearch import Elasticsearch
from api.models import FundHistoricalNAV, MFHolding, Account
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

    # Resolve the account for scoping validations:
    # Prefer account in `data` (may be an object or id), else from instance, else user's primary account.
    account = data.get("account") if isinstance(data, dict) else None
    if account is None and instance is not None:
        account = getattr(instance, "account", None)
    if account is None:
        account = Account.objects.filter(user=user, is_primary=True).first()
    # Normalize to id for filtering and capture name for messaging
    account_id = getattr(account, "id", account)
    account_obj = account if hasattr(account, "id") else (
        Account.objects.filter(id=account_id, user=user).first() if account_id is not None else None
    )
    account_name = getattr(account_obj, "name", None) or "selected account"
    account_phrase = f" in account '{account_name}'"

    # NAV validation
    nav_obj = fetch_nav_from_es_or_db(fund, tx_date)
    historical_nav = Decimal(nav_obj.nav)
    TOLERANCE = Decimal("0.1")
    if abs(input_nav - historical_nav) > TOLERANCE:
        raise serializers.ValidationError(
            f"The supplied NAV ({input_nav}) does not match the official NAV ({round(historical_nav, 2)}) "
            f"for {getattr(fund, 'mf_name', '')} on {tx_date}."
        )

    # Negative sales validation
    if txn_type == "SELL":
        qs = MFHolding.objects.filter(user=user, fund=fund)
        if account_id is not None:
            qs = qs.filter(account_id=account_id)

        # Date-aware availability check as of tx_date:
        buy_upto = (
            qs.filter(type="BUY", transacted_at__lte=tx_date).aggregate(total=models.Sum("units"))["total"]
            or Decimal("0")
        )
        sell_upto_qs = qs.filter(type="SELL", transacted_at__lte=tx_date)
        if instance is not None:
            try:
                sell_upto_qs = sell_upto_qs.exclude(pk=getattr(instance, "pk", None))
            except Exception:
                pass
        sell_upto = sell_upto_qs.aggregate(total=models.Sum("units"))["total"] or Decimal("0")
        available_at_date = buy_upto - sell_upto

        if units > available_at_date:
            avail_fmt = available_at_date.quantize(Decimal("0.0001")) if available_at_date > 0 else Decimal("0")
            if instance is not None:
                # Edit-specific message
                if available_at_date <= 0:
                    raise serializers.ValidationError(
                        f"On {tx_date}, you had 0 units available to sell in {fund.mf_name}{account_phrase}. "
                        f"Adjust other sales or add more units before selling."
                    )
                raise serializers.ValidationError(
                    f"For this edit on {tx_date}, you can sell at most {avail_fmt} units based on your holdings "
                    f"(buys before this date minus prior sales) in {fund.mf_name}{account_phrase}."
                )
            # Create/new SELL message
            if available_at_date <= 0:
                raise serializers.ValidationError(
                    f"On {tx_date}, you had 0 units available to sell in {fund.mf_name}{account_phrase}. "
                    f"You cannot sell {round(units, 2)} units."
                )
            raise serializers.ValidationError(
                f"On {tx_date}, only {avail_fmt} units were available to sell in {fund.mf_name}{account_phrase}. "
                f"You cannot sell {round(units, 2)} units."
            )
        
        # Account-scoped overall availability (buys minus sells)
        total_buy = qs.filter(type="BUY").aggregate(total=models.Sum("units"))["total"] or Decimal("0")

        # When editing an existing SELL transaction, exclude it from the total_sell sum
        sell_qs = qs.filter(type="SELL")
        if instance is not None:
            try:
                # Exclude the current instance if it's part of the SELL set
                sell_qs = sell_qs.exclude(pk=getattr(instance, "pk", None))
            except Exception:
                pass

        total_sell = sell_qs.aggregate(total=models.Sum("units"))["total"] or Decimal("0")
        net_available = total_buy - total_sell

        if units > net_available:
            # Provide clearer guidance when editing an existing SELL
            if instance is not None:
                max_units = net_available.quantize(Decimal("0.0001"))
                if net_available <= 0:
                    raise serializers.ValidationError(
                        f"For this edit, no units are available to sell after your other sales{account_phrase}. "
                        f"Reduce other sales or add more units before selling from {fund.mf_name}."
                    )
                raise serializers.ValidationError(
                    f"For this edit, you can sell at most {round(max_units, 2)} units based on your current holdings "
                    f"(buys minus other sales) in {fund.mf_name}{account_phrase}."
                )
            # Default message for create/new SELL
            raise serializers.ValidationError(
                f"Cannot sell {round(units, 2)} units: only {round(net_available, 2)} units currently held in {fund.mf_name}{account_phrase}."
            )
