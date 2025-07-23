from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import MutualFund, FundHistoricalNAV
import requests
from datetime import datetime, timedelta
from django.db import models, IntegrityError

BATCH_SIZE = 10
NAV_UPDATE_INTERVAL_HOURS = 24

class Command(BaseCommand):
    help = 'Updates NAV and stores historical NAVs in a separate table.'

    def handle(self, *args, **kwargs):
        updated_total, failed_total = 0, 0
        while True:
            cutoff_time = timezone.now() - timedelta(hours=NAV_UPDATE_INTERVAL_HOURS)
            funds = MutualFund.objects.filter(
                isin_growth__isnull=False
            ).exclude(
                isin_growth=''
            ).filter(
                models.Q(nav_last_updated__lt=cutoff_time) | models.Q(nav_last_updated__isnull=True)
            )[:BATCH_SIZE]

            if not funds:
                self.stdout.write(f"All funds processed. {updated_total} updated, {failed_total} failed.")
                break

            updated, failed = 0, 0
            for fund in funds:
                try:
                    url = f"https://mf.captnemo.in/nav/{fund.isin_growth}"
                    resp = requests.get(url, timeout=10)
                    if resp.status_code != 200:
                        self.stderr.write(f"Failed to fetch NAV for {fund.mf_name} (ISIN: {fund.isin_growth})")
                        failed += 1
                        continue
                    data = resp.json()
                    nav = data.get("nav")
                    nav_date = data.get("date")
                    historical_nav = data.get("historical_nav", [])

                    ###### Store historical NAVs from API ######
                    for dt, nav_val in historical_nav:
                        dt_obj = datetime.strptime(dt, "%Y-%m-%d").date()
                        try:
                            FundHistoricalNAV.objects.get_or_create(
                                isin_growth=fund.isin_growth,
                                date=dt_obj,
                                defaults={'nav': nav_val}
                            )
                        except IntegrityError:
                            pass  # already exists

                    ###### Optionally save yesterday's latest_nav before overwriting ######
                    # Only do this if latest_nav_date is before today's
                    if fund.latest_nav is not None and fund.latest_nav_date and nav_date:
                        latest_fund_date = fund.latest_nav_date
                        today_date_obj = datetime.strptime(nav_date, "%Y-%m-%d").date()
                        if latest_fund_date < today_date_obj:
                            FundHistoricalNAV.objects.get_or_create(
                                isin_growth=fund.isin_growth,
                                date=latest_fund_date,
                                defaults={'nav': fund.latest_nav}
                            )

                    ###### Update MutualFund with new latest NAV ######
                    if nav and nav_date:
                        fund.latest_nav = nav
                        fund.latest_nav_date = datetime.strptime(nav_date, "%Y-%m-%d").date()
                        fund.nav_last_updated = timezone.now()
                        fund.save(update_fields=['latest_nav', 'latest_nav_date', 'nav_last_updated'])
                        updated += 1
                        self.stdout.write(f"Updated {fund.mf_name}: NAV={nav} Date={nav_date}")
                    else:
                        failed += 1
                        self.stderr.write(f"No NAV for {fund.mf_name} (ISIN: {fund.isin_growth})")
                except Exception as e:
                    failed += 1
                    self.stderr.write(f"Error updating {fund.mf_name} (ISIN: {fund.isin_growth}): {e}")

            updated_total += updated
            failed_total += failed

