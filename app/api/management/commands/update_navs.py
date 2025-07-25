from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import MutualFund, FundHistoricalNAV
import requests
from datetime import datetime, timedelta
from django.db import models, IntegrityError

BATCH_SIZE = 10

class Command(BaseCommand):
    help = 'Updates NAV and stores historical NAVs in a separate table.'

    def handle(self, *args, **kwargs):
        updated_total, failed_total, deleted_total = 0, 0, 0
        while True:
            today_start = timezone.localtime(timezone.now()).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            ten_days_ago = timezone.localdate() - timedelta(days=10)
            funds = MutualFund.objects.filter(
                isin_growth__isnull=False
            ).exclude(
                isin_growth=''
            ).filter(
                models.Q(nav_last_updated__lt=today_start) | models.Q(nav_last_updated__isnull=True)
            ).filter(
                models.Q(latest_nav_date__gte=ten_days_ago) | models.Q(latest_nav_date__isnull=True)
            )[:BATCH_SIZE]

            if not funds:
                self.stdout.write(
                    f"All funds processed. {updated_total} updated, {failed_total} failed, {deleted_total} deleted."
                )
                break

            updated, failed, deleted = 0, 0, 0
            for fund in funds:
                try:
                    url = f"https://mf.captnemo.in/nav/{fund.isin_growth}"
                    resp = requests.get(url, timeout=10)
                    if resp.status_code != 200:
                        self.stderr.write(
                            f"Failed to fetch NAV ({resp.status_code}) for {fund.mf_name} (ISIN: {fund.isin_growth}). Deleting fund."
                        )
                        fund.delete()
                        deleted += 1
                        continue

                    data = resp.json()
                    nav = data.get("nav")
                    nav_date = data.get("date")
                    historical_nav = data.get("historical_nav", [])
                    
                    last_updated = fund.nav_last_updated  # Can be None!
                    # Store historical NAVs
                    for dt, nav_val in historical_nav:
                        dt_obj = datetime.strptime(dt, "%Y-%m-%d").date()
                        if last_updated and dt_obj <= last_updated.date():
                            # Already processed, skip
                            continue
                        try:
                            FundHistoricalNAV.objects.get_or_create(
                                isin_growth=fund.isin_growth,
                                date=dt_obj,
                                defaults={'nav': nav_val}
                            )
                        except IntegrityError:
                            pass  # already exists

                    # Optionally save yesterday's NAV
                    if fund.latest_nav is not None and fund.latest_nav_date and nav_date:
                        latest_fund_date = fund.latest_nav_date
                        today_date_obj = datetime.strptime(nav_date, "%Y-%m-%d").date()
                        if latest_fund_date < today_date_obj:
                            FundHistoricalNAV.objects.get_or_create(
                                isin_growth=fund.isin_growth,
                                date=latest_fund_date,
                                defaults={'nav': fund.latest_nav}
                            )

                    # Update or delete
                    if nav and nav_date:
                        fund.latest_nav = nav
                        fund.latest_nav_date = datetime.strptime(nav_date, "%Y-%m-%d").date()
                        fund.nav_last_updated = timezone.now()
                        fund.save(update_fields=['latest_nav', 'latest_nav_date', 'nav_last_updated'])
                        updated += 1
                        self.stdout.write(
                            f"Updated {fund.mf_name}: NAV={nav} Date={nav_date} ISIN={fund.isin_growth}"
                        )
                    else:
                        self.stderr.write(
                            f"No NAV in API response for {fund.mf_name} (ISIN: {fund.isin_growth}) — DELETING fund from DB."
                        )
                        fund.delete()
                        deleted += 1
                except Exception as e:
                    failed += 1
                    self.stderr.write(f"Error updating {fund.mf_name} (ISIN: {fund.isin_growth}): {e}")

            updated_total += updated
            failed_total += failed
            deleted_total += deleted
