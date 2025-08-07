# api/utils/transaction_import.py
import csv
import io
from datetime import datetime
from collections import defaultdict
from django.db.models import Q

from api.models import MutualFund, FundHistoricalNAV, MFHolding

SUPPORTED_ORDER_TYPES = {"buy": MFHolding.TYPE_BUY, "sell": MFHolding.TYPE_SELL}


def parse_date_safe(date_str):
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except Exception:
            continue
    return None


def validate_nav(fund, nav_date, nav_val, tolerance=0.1):
    nav_record = FundHistoricalNAV.objects.filter(
        isin_growth=fund.isin_growth, date=nav_date
    ).first()
    if not nav_record:
        return (
            False,
            f"No historical NAV for {fund.kuvera_name or fund.mf_name} on {nav_date}",
        )
    try:
        nav_db_val = float(nav_record.nav)
        if abs(nav_db_val - nav_val) > tolerance:
            return (
                False,
                f"NAV {nav_val} does not match official NAV {nav_db_val} for {fund.kuvera_name or fund.mf_name} on {nav_date}",
            )
        return True, ""
    except Exception as e:
        return (
            False,
            f"Error comparing NAV for {fund.kuvera_name or fund.mf_name} on {nav_date}: {e}",
        )


def load_existing_holdings(user, fund_ids):
    holdings = defaultdict(float)
    prev_transactions = (
        MFHolding.objects.filter(user=user, fund_id__in=fund_ids)
        .order_by("transacted_at", "created_at")
        .values("fund_id", "type", "units")
    )
    for tx in prev_transactions:
        if tx["type"] == MFHolding.TYPE_BUY:
            holdings[tx["fund_id"]] += float(tx["units"])
        elif tx["type"] == MFHolding.TYPE_SELL:
            holdings[tx["fund_id"]] -= float(tx["units"])
    return holdings


def process_kuvera_transactions(user, rows):
    # Filter, map funds, sort, prepare, and validate
    # Return (errors, new_holdings_to_create)
    errors = []
    # Filter for only valid orders
    rows = [
        row
        for row in rows
        if row.get("Order", "").strip().lower() in SUPPORTED_ORDER_TYPES
    ]
    names_in_file = set(
        row["Name of the Fund"].strip() for row in rows if row.get("Name of the Fund")
    )
    funds_qs = MutualFund.objects.filter(kuvera_name__in=names_in_file)
    funds_map = {fund.kuvera_name.strip(): fund for fund in funds_qs}
    unknown_names = names_in_file - funds_map.keys()
    if unknown_names:
        return [
            f"Unmatched fund names (kuvera_name): {sorted(list(unknown_names))}"
        ], []

    # Parse and validate date, add 'ParsedDate'
    for row in rows:
        pd = parse_date_safe(row.get("Date", ""))
        if pd is None:
            return [f"Invalid date format in row with Date: {row.get('Date')}"], []
        row["ParsedDate"] = pd

    rows.sort(key=lambda r: r["ParsedDate"])
    fund_ids = [fund.id for fund in funds_map.values()]
    holdings = load_existing_holdings(user, fund_ids)

    new_holdings_to_create = []

    for idx, row in enumerate(rows, start=2):
        fund = funds_map[row["Name of the Fund"].strip()]
        try:
            units = float(row.get("Units", "0").strip())
        except Exception:
            errors.append(f"Row {idx}: Invalid Units '{row.get('Units')}'")
            continue

        trans_type_str = row.get("Order", "").strip().lower()
        mf_type = SUPPORTED_ORDER_TYPES[trans_type_str]
        nav_str = row.get("NAV", "").strip()
        nav_date = row["ParsedDate"]
        try:
            nav_val = float(nav_str)
        except Exception:
            continue

        # NAV validation
        valid_nav, nav_err = validate_nav(fund, nav_date, nav_val, tolerance=0.1)
        if not valid_nav:
            errors.append(f"Row {idx}: {nav_err}")
            continue

        # SELL validation
        if mf_type == MFHolding.TYPE_SELL:
            if units > holdings[fund.id] + 1e-8:
                errors.append(
                    f"Row {idx}: Sell {units}, but only {holdings[fund.id]:.4f} held ({fund.kuvera_name or fund.mf_name})"
                )
                continue
            holdings[fund.id] -= units
        else:
            holdings[fund.id] += units

        new_holding = MFHolding(
            user=user,
            fund=fund,
            transacted_at=nav_date,
            type=mf_type,
            units=units,
            nav=nav_val,
        )
        new_holdings_to_create.append(new_holding)

    return errors, new_holdings_to_create


def clean_csv_rows(file_obj):
    decoded = file_obj.read().decode("utf-8")
    io_string = io.StringIO(decoded)
    # Read original rows
    reader = csv.DictReader(io_string)
    # Strip spaces from fieldnames
    reader.fieldnames = [h.strip() for h in reader.fieldnames]
    clean_rows = []
    for row in reader:
        clean_row = {k.strip(): (v.strip() if v else v) for k, v in row.items()}
        clean_rows.append(clean_row)
    return clean_rows


def process_self_transactions(user, rows, column_map):
    """
    Processes arbitrary user-uploaded transaction CSVs according to their mapping.
    Returns (errors, new_holdings_to_create)
    """
    errors = []
    # Normalize mapping: all keys/values as lower/stripped
    normalized_map = {k.strip().lower(): v.strip() for k, v in column_map.items()}
    required_fields = ["date", "units", "type", "nav", "fund_name"]
    missing_fields = [f for f in required_fields if f not in normalized_map]
    if missing_fields:
        return [f"Missing required mapping for: {', '.join(missing_fields)}"], []

    map_to_csv = {f: normalized_map[f] for f in required_fields}
    # Validate all mapped columns actually exist in the rows
    csv_fields = set(rows[0].keys()) if rows else set()
    missing_cols = [v for v in map_to_csv.values() if v not in csv_fields]
    if missing_cols:
        return [f"CSV missing columns required for import: {missing_cols}"], []

    # Map fund names to DB objects
    fund_names = set(
        row[map_to_csv["fund_name"]] for row in rows if row.get(map_to_csv["fund_name"])
    )
    # Normalize fund_names from CSV (strip + lower)
    fund_names_normalized = set(name.strip().lower() for name in fund_names if name)

    funds_qs = MutualFund.objects.filter(
        Q(mf_name__in=fund_names) | Q(kuvera_name__in=fund_names)
    )
    funds_map = {}
    for f in funds_qs:
        if f.mf_name:
            funds_map[f.mf_name.strip().lower()] = f
        if f.kuvera_name:
            funds_map[f.kuvera_name.strip().lower()] = f
    unknown_funds = [
        name for name in fund_names_normalized if name not in funds_map.keys()
    ]
    if unknown_funds:
        return [
            f"Some fund names in your file are not tracked in our database: {sorted(list(unknown_funds))}"
        ], []

    # Parse and sort by date
    for r in rows:
        r["_parsed_date"] = parse_date_safe(r[map_to_csv["date"]])
    rows_valid = [r for r in rows if r["_parsed_date"] is not None]
    rows_valid.sort(key=lambda r: r["_parsed_date"])

    fund_ids = [fund.id for fund in funds_map.values()]
    holdings = load_existing_holdings(user, fund_ids)
    new_holdings = []

    for idx, row in enumerate(rows_valid, start=2):
        row_fund_normalized = row[map_to_csv["fund_name"]].strip().lower()
        fund = funds_map.get(row_fund_normalized)
        if not fund:
            errors.append(
                f"Unknown fund name '{row[map_to_csv['fund_name']]}' at row {idx}"
            )
            continue
        # Order type normalization/support
        type_str_raw = row[map_to_csv["type"]].strip().lower()
        if type_str_raw not in SUPPORTED_ORDER_TYPES:
            errors.append(f"Row {idx}: Invalid order type '{row[map_to_csv['type']]}'")
            continue
        mf_type = SUPPORTED_ORDER_TYPES[type_str_raw]
        # Units, NAV, date
        try:
            units = float(row[map_to_csv["units"]])
            nav_val = float(row[map_to_csv["nav"]])
            tx_date = row["_parsed_date"]
        except Exception as e:
            errors.append(f"Row {idx}: Invalid units/nav/date: {e}")
            continue
        # NAV validation (can be made optional if needed)
        valid_nav, nav_err = validate_nav(fund, tx_date, nav_val, tolerance=0.1)
        if not valid_nav:
            errors.append(f"Row {idx}: {nav_err}")
            continue
        # Negative sales
        if mf_type == MFHolding.TYPE_SELL and units > holdings[fund.id] + 1e-8:
            errors.append(
                f"Row {idx}: Selling {units}, but only {holdings[fund.id]:.4f} held"
            )
            continue
        if mf_type == MFHolding.TYPE_SELL:
            holdings[fund.id] -= units
        else:
            holdings[fund.id] += units
        # Prepare object
        new_holdings.append(
            MFHolding(
                user=user,
                fund=fund,
                transacted_at=tx_date,
                type=mf_type,
                units=units,
                nav=nav_val,
            )
        )
    return errors, new_holdings
