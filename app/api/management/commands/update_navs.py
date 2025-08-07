from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import MutualFund, FundHistoricalNAV
import requests
from datetime import datetime, timedelta
from django.db import models, IntegrityError

BATCH_SIZE = 10


class Command(BaseCommand):
    help = "Updates NAV and stores historical NAVs in a separate table."

    def handle(self, *args, **kwargs):
        updated_total, failed_total, deleted_total = 0, 0, 0
        today_start = timezone.localtime(timezone.now()).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        ten_days_ago = timezone.localdate() - timedelta(days=10)

        total_funds = (
            MutualFund.objects.filter(isin_growth__isnull=False)
            .exclude(isin_growth="")
            .filter(
                models.Q(nav_last_updated__lt=today_start)
                | models.Q(nav_last_updated__isnull=True)
            )
            .filter(
                models.Q(latest_nav_date__gte=ten_days_ago)
                | models.Q(latest_nav_date__isnull=True)
            )
            .count()
        )
        fund_counter = 0

        while True:
            funds = (
                MutualFund.objects.filter(isin_growth__isnull=False)
                .exclude(isin_growth="")
                .filter(
                    models.Q(nav_last_updated__lt=today_start)
                    | models.Q(nav_last_updated__isnull=True)
                )
                .filter(
                    models.Q(latest_nav_date__gte=ten_days_ago)
                    | models.Q(latest_nav_date__isnull=True)
                )[:BATCH_SIZE]
            )

            if not funds:
                self.stdout.write(
                    f"All funds processed. {updated_total} updated, {failed_total} failed, {deleted_total} deleted."
                )
                break

            updated, failed, deleted = 0, 0, 0
            for fund in funds:
                fund_counter += 1  # Increment for each fund processed
                try:
                    url = f"https://api.mfapi.in/mf/{fund.mf_schema_code}"
                    resp = requests.get(url, timeout=12)
                    if resp.status_code != 200:
                        self.stderr.write(
                            f"Failed to fetch NAV ({resp.status_code}) for {fund.mf_name} (ISIN: {fund.isin_growth}). Deleting fund."
                        )
                        fund.delete()
                        deleted += 1
                        continue

                    data = resp.json()
                    historical_nav = data.get("data", [])
                    latest_nav_record = historical_nav[0]
                    latest_nav_date_str = latest_nav_record.get("date")
                    latest_nav_val_str = latest_nav_record.get("nav")

                    # Parse latest NAV/date (from DD-MM-YYYY)
                    nav_date = datetime.strptime(latest_nav_date_str, "%d-%m-%Y").date()
                    nav = nav_val = float(latest_nav_val_str.replace(",", ""))
                    last_updated = fund.nav_last_updated  # Can be None!

                    # Store historical NAVs
                    for entry in historical_nav:
                        # entry: {'date': '24-07-2025', 'nav': '52.18300'}
                        dt_str = entry.get("date")
                        nav_str = entry.get("nav")
                        if not (dt_str and nav_str):
                            continue  # skip incomplete entries
                        try:
                            dt_obj = datetime.strptime(dt_str, "%d-%m-%Y").date()
                            nav_val = float(
                                nav_str.replace(",", "")
                            )  # in case commas present
                        except Exception:
                            continue  # skip malformed data
                        if last_updated and dt_obj <= last_updated.date():
                            continue  # Already processed
                        try:
                            FundHistoricalNAV.objects.get_or_create(
                                isin_growth=fund.isin_growth,
                                date=dt_obj,
                                defaults={"nav": nav_val},
                            )
                        except IntegrityError:
                            # Already exists
                            pass

                    # Optionally save yesterday's NAV
                    if (
                        fund.latest_nav is not None
                        and fund.latest_nav_date
                        and nav_date
                    ):
                        latest_fund_date = fund.latest_nav_date
                        if latest_fund_date < nav_date:
                            FundHistoricalNAV.objects.get_or_create(
                                isin_growth=fund.isin_growth,
                                date=latest_fund_date,
                                defaults={"nav": fund.latest_nav},
                            )

                    # Update or delete
                    if nav and nav_date:
                        fund.latest_nav = nav
                        fund.latest_nav_date = nav_date
                        fund.nav_last_updated = timezone.now()
                        fund.save(
                            update_fields=[
                                "latest_nav",
                                "latest_nav_date",
                                "nav_last_updated",
                            ]
                        )
                        updated += 1
                        self.stdout.write(
                            f"Fund {fund_counter}/{total_funds} Updated {fund.mf_name}: NAV={nav} Date={nav_date} ISIN={fund.isin_growth}"
                        )
                    else:
                        fund.delete()
                        self.stderr.write(
                            f"Failed updating {fund.mf_name}: NAV={nav} Date={nav_date} ISIN={fund.isin_growth}"
                        )
                        deleted += 1
                except Exception as e:
                    failed += 1
                    self.stderr.write(
                        f"Error updating {fund.mf_name} (ISIN: {fund.isin_growth}): {e}"
                    )

            updated_total += updated
            failed_total += failed
            deleted_total += deleted
