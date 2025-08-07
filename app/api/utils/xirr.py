# utils/xirr.py
import pyxirr


def xirr(cashflows, dates):
    try:
        val = pyxirr.xirr(dates, cashflows) * 100
        return round(val, 2)
    except Exception as e:
        print("pyxirr failed:", e)
        return None
