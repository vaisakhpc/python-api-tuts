from decimal import Decimal
from datetime import date
from collections import defaultdict
from django.utils.timezone import now
from api.models import FundHistoricalNAV, EquityTaxRates, MutualFund

def calculate_equity_capital_gains(
    fund: MutualFund,
    purchase_records: list,  # List of dicts or objects with keys: 'units', 'purchase_date', 'purchase_nav', 'amount'
    sell_date: date = None,
):
    """
    Calculate possible LTCG and STCG for an equity fund on `sell_date`.

    Args:
        fund (MutualFund): The mutual fund instance.
        purchase_records (list): List of purchases with keys:
            - units (Decimal)
            - purchase_date (date)
            - purchase_nav (Decimal)
            - amount (Decimal)
        sell_date (date, optional): Date to consider as sell date; defaults to latest NAV date if None.

    Returns:
        dict with keys:
            - 'ltcg': {'gain': Decimal, 'taxable_gain': Decimal, 'tax': Decimal}
            - 'stcg': {'gain': Decimal, 'taxable_gain': Decimal, 'tax': Decimal}
    """
    # Check if fund type contains 'Equity' (case-insensitive)
    if not fund.type or 'equity' not in fund.type.lower():
        return {
            "error": "Fund is not eligible for Equity capital gains calculation (type missing or not Equity)."
        }

    # Use latest NAV date if not provided
    if sell_date is None:
        latest_nav =fund.latest_nav
        if not latest_nav:
            return {"error": "No NAV data found for the fund to determine sell date."}
        sell_date = fund.latest_nav_date
        sell_nav_val = Decimal(latest_nav)
    else:
        nav_entry = FundHistoricalNAV.objects.filter(isin_growth=fund.isin_growth, date=sell_date).first()
        if not nav_entry:
            return {"error": f"No NAV on specified sell_date: {sell_date}"}
        sell_nav_val = Decimal(nav_entry.nav)

    # Fetch equity tax rates for the sell year (FY start assumed 1 April previous year)
    year = sell_date.year
    if sell_date.month < 4:
        year -= 1  # if before April, tax year is previous calendar year

    rates = EquityTaxRates.objects.filter(year=year).first()
    if not rates:
        return {"error": f"No equity tax rates configured for year {year}."}

    # Accumulators
    ltcg_gain = Decimal('0')
    stcg_gain = Decimal('0')
    ltcg_loss = Decimal('0')
    stcg_loss = Decimal('0')

    # Calculate capital gains per purchase lot
    for rec in purchase_records:
        units = Decimal(rec['units'])
        purchase_date = rec['purchase_date']
        purchase_nav = Decimal(rec['purchase_nav'])
        # amount = Decimal(rec['amount'])  # Not used directly here, but useful for reference

        # Compute holding period and gain
        holding_days = (sell_date - purchase_date).days
        initial_value = units * purchase_nav
        sell_value = units * sell_nav_val
        gain = sell_value - initial_value

        if holding_days >= rates.ltcg_holding_period_days:
            if gain > 0:
                ltcg_gain += gain
            else:
                ltcg_loss += abs(gain)
        else:
            if gain > 0:
                stcg_gain += gain
            else:
                stcg_loss += abs(gain)

    # Offset losses as per rules
    # STCL can be set off against both STCG and LTCG
    net_stcg = stcg_gain - stcg_loss
    net_ltcg = ltcg_gain - ltcg_loss
    # If STCL > STCG, offset remaining STCL against LTCG
    if net_stcg < 0:
        net_ltcg += net_stcg  # net_stcg is negative, so this reduces net_ltcg
        net_stcg = Decimal('0')

    # Apply LTCG exemption and calculate tax
    ltcg_exempt = rates.ltcg_exemption_limit
    taxable_ltcg = max(net_ltcg - ltcg_exempt, Decimal('0'))
    ltcg_tax = taxable_ltcg * rates.ltcg_rate_percent / Decimal('100')

    # Apply STCG exemption (if any) and calculate tax
    stcg_exempt = getattr(rates, 'stcg_exemption_limit', Decimal('0')) or Decimal('0')
    taxable_stcg = max(net_stcg - stcg_exempt, Decimal('0'))
    stcg_tax = taxable_stcg * rates.stcg_rate_percent / Decimal('100')

    return {
        "ltcg": {
            "gain": round(float(net_ltcg), 2),
            "taxable_gain": round(float(taxable_ltcg), 2),
            "tax": round(float(ltcg_tax), 2),
            "exemption_limit": float(ltcg_exempt),
            "rate_percent": float(rates.ltcg_rate_percent)
        },
        "stcg": {
            "gain": round(float(net_stcg), 2),
            "taxable_gain": round(float(taxable_stcg), 2),
            "tax": round(float(stcg_tax), 2),
            "exemption_limit": float(stcg_exempt),
            "rate_percent": float(rates.stcg_rate_percent)
        },
        "sell_date": sell_date.isoformat(),
    }
