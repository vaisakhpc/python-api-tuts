def fifo_cost_basis(transactions):
    buys = []
    # Step 1: Prepare a queue of open buys, each as dict {"units_left", "nav", "orig_units"}
    for t in sorted(transactions, key=lambda x: x["transacted_at"]):
        if t["type"] == "BUY":
            buys.append(
                {
                    "units_left": t["units"],
                    "nav": t["nav"],
                    "orig_units": t["units"],
                }
            )
        elif t["type"] == "SELL":
            qty = t["units"]
            # Step 2: Apply sell units against buys using FIFO
            for buy in buys:
                if qty <= 0:
                    break
                take = min(buy["units_left"], qty)
                buy["units_left"] -= take
                qty -= take
            # If you ever have more sold than bought, handle as error or "short" sale.
    # Step 3: Remaining open lots: units_left > 0
    open_lots = [b for b in buys if b["units_left"] > 0]
    invested = sum(b["units_left"] * b["nav"] for b in open_lots)
    open_units = sum(b["units_left"] for b in open_lots)
    return invested, open_units


def fifo_open_lots(transactions):
    """
    Returns a list of open lots: each dict has
    {'units_left', 'nav', 'fund', 'transacted_at'}
    """
    lots = []
    for t in sorted(transactions, key=lambda x: (x["fund"], x["transacted_at"])):
        if t["type"] == "BUY":
            lots.append(
                {
                    "units_left": t["units"],
                    "nav": t["nav"],
                    "fund": t["fund"],
                    "transacted_at": t["transacted_at"],
                }
            )
        elif t["type"] == "SELL":
            qty = t["units"]
            for lot in lots:
                if lot["fund"] != t["fund"]:
                    continue
                if qty <= 0:
                    break
                take = min(lot["units_left"], qty)
                lot["units_left"] -= take
                qty -= take
    return [lot for lot in lots if lot["units_left"] > 0]
