from django.core.management.base import BaseCommand
from django.db import models
from api.models import MutualFund
import requests
from time import sleep

BATCH_SIZE = 10


class Command(BaseCommand):
    help = "Update kuvera_name for MutualFunds where kuvera_name is null or blank. Mark invalid ISINs with 'N/A' to skip in future."

    def handle(self, *args, **kwargs):
        while True:
            # Query funds with empty or null kuvera_name, excluding blank isin_growth
            funds = MutualFund.objects.filter(
                models.Q(kuvera_name__isnull=True) | models.Q(kuvera_name="")
            ).exclude(isin_growth__exact="")[:BATCH_SIZE]
            if not funds:
                self.stdout.write(
                    self.style.SUCCESS("All funds processed for kuvera_name update!")
                )
                break

            for fund in funds:
                isin = fund.isin_growth
                url = f"https://mf.captnemo.in/kuvera/{isin}"
                try:
                    resp = requests.get(url, timeout=8)
                    if resp.status_code == 404:
                        self._mark_na(fund, isin, "404 Not found")
                        continue

                    data = resp.json()

                    if "error" in data:
                        self._mark_na(fund, isin, data["error"])
                        continue

                    kuvera_name = None
                    # Depending on response structure, extract the fund info
                    if isinstance(data, list) and data and isinstance(data[0], dict):
                        api_fund = data[0]
                    elif isinstance(data, dict):
                        api_fund = data
                    else:
                        self._mark_na(fund, isin, "Invalid API response structure")
                        continue

                    kuvera_name = api_fund.get("name")
                    if kuvera_name:
                        fund.kuvera_name = kuvera_name
                        fund.save(update_fields=["kuvera_name"])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"ISIN {isin}: KuveraName → {kuvera_name}"
                            )
                        )
                    else:
                        self._mark_na(fund, isin, "No 'name' field in API response")

                except Exception as e:
                    self.stderr.write(f"Error for ISIN {isin}: {e}")

    def _mark_na(self, fund, isin, reason):
        # Mark kuvera_name as 'N/A' to skip on future runs
        fund.kuvera_name = "N/A"
        fund.save(update_fields=["kuvera_name"])
        self.stdout.write(
            self.style.WARNING(f"ISIN {isin}: {reason}. Marking as 'N/A'.")
        )
