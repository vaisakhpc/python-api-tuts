from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import MFHolding
from api.utils.xirr import xirr
from datetime import timedelta
from django.utils import timezone
from api.utils.fifo_util import fifo_open_lots
from django.conf import settings
import traceback
import logging


class PortfolioReturnsView(APIView):
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer]

    def get(self, request):
        # Set up logging
        logger = logging.getLogger(__name__)
        ten_days_ago = timezone.localdate() - timedelta(days=10)
        user = request.user
        # Optional account filter
        account_id_param = request.query_params.get("account")
        account_id = None
        if account_id_param is not None and str(account_id_param).strip() != "":
            try:
                account_id = int(account_id_param)
            except ValueError:
                return Response({"statusCode": 400, "errorMessage": "Invalid account id"}, status=400)
        # Only include funds updated in the last 10 days (active funds)
        base_qs = MFHolding.objects.filter(user=user, fund__latest_nav_date__gte=ten_days_ago)
        if account_id is not None:
            base_qs = base_qs.filter(account_id=account_id)
        txns = base_qs.select_related("fund").order_by("fund", "transacted_at", "id")

        # Gather all txns as dicts (flat for XIRR, FIFO)
        txn_list = [
            {
                "type": t.type,
                "units": float(t.units),
                "nav": float(t.nav),
                "transacted_at": t.transacted_at,
                "fund": t.fund.id,
                "fund_obj": t.fund,
            }
            for t in txns
        ]

        # FIFO cost basis of all open lots (per fund)
        open_lots = fifo_open_lots(txn_list)

        total_invested = 0
        current_value = 0
        fund_obj_map = {t["fund"]: t["fund_obj"] for t in txn_list}
        for lot in open_lots:
            fund_obj = fund_obj_map[lot["fund"]]
            total_invested += lot["units_left"] * lot["nav"]
            latest_nav = float(fund_obj.latest_nav or 0)
            current_value += lot["units_left"] * latest_nav

        total_invested = round(total_invested, 2)
        current_value = round(current_value, 2)
        profit = round(current_value - total_invested, 2)
        absolute_return = (
            round(((profit / total_invested) * 100), 2) if total_invested else None
        )

        # Prepare cashflows for XIRR: all buys(-), all sells(+), open lots (+) at 'today'
        cashflows = []
        dates = []
        for t in txn_list:
            amt = float(t["units"]) * float(t["nav"])
            if t["type"] == "BUY":
                cashflows.append(-amt)
                dates.append(t["transacted_at"])
            elif t["type"] == "SELL":
                cashflows.append(amt)
                dates.append(t["transacted_at"])
        # Add *each open lot* as a positive cash flow at latest fund NAV/date
        for lot in open_lots:
            fund_obj = [t["fund_obj"] for t in txn_list if t["fund"] == lot["fund"]][0]
            latest_nav = float(fund_obj.latest_nav or 0)
            latest_nav_date = fund_obj.latest_nav_date or timezone.localdate()
            value = lot["units_left"] * latest_nav
            if value > 0:
                cashflows.append(value)
                dates.append(latest_nav_date)

        # XIRR Calculation
        if not (any(cf < 0 for cf in cashflows) and any(cf > 0 for cf in cashflows)):
            xirr_val = None
        else:
            try:
                xirr_val = xirr(cashflows, dates)
            except Exception as e:
                logger.warning(f"XIRR calculation failed: {traceback.format_exc()}")
                xirr_val = None

        payload = {
            "total_invested": total_invested,
            "current_value": current_value,
            "profit": profit,
            "absolute_return": absolute_return,
            "xirr": xirr_val,
        }
        if account_id is not None:
            payload["account_id"] = account_id
        return Response(payload)
