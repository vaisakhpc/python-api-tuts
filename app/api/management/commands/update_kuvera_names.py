from time import time
from django.core.management.base import BaseCommand
from django.db import models
from api.models import MutualFund
import requests

BATCH_SIZE = 10

NA_LABEL = "N/A"

class Command(BaseCommand):
    help = "Update kuvera_name and kuvera_slug for MutualFunds. Supports both creation and editing."

    def add_arguments(self, parser):
        # Add an optional argument to specify whether to edit existing records
        parser.add_argument(
            '--edit',
            action='store_true',
            help='Edit existing records where kuvera_name is not null or blank.'
        )
        
    def handle(self, *args, **kwargs):
        # Record the start time
        start_time = time()
        edit_mode = kwargs.get('edit', False)
        if edit_mode:
            # Query funds with non-null kuvera_name, excluding blank and "N/A" labels
            funds_queryset = MutualFund.objects.filter(
                kuvera_name__isnull=False
            ).exclude(
                kuvera_name=""
            ).exclude(
                kuvera_name=NA_LABEL  # Exclude "N/A" label
            ).exclude(kuvera_slug__isnull=False) # Exclude if kuvera_slug is already set
            total_funds = funds_queryset.count()  # Get the total number of funds
            self.stdout.write(self.style.WARNING(f"Running in EDIT mode. Total funds to process: {total_funds}"))
        else:
            # Query funds with null or blank kuvera_name for creation
            funds_queryset = MutualFund.objects.filter(
                models.Q(kuvera_name__isnull=True) | models.Q(kuvera_name="")
            ).exclude(isin_growth__exact="")
            total_funds = funds_queryset.count()  # Get the total number of funds
            self.stdout.write(self.style.WARNING(f"Running in CREATE mode. Total funds to process: {total_funds}"))
        # Process funds in batches
        processed_count = 0

        while True:
            funds = funds_queryset[:BATCH_SIZE]
            if not funds:
                self.stdout.write(self.style.SUCCESS("No more funds to process!"))
                break

            for fund in funds:
                processed_count += 1
                self.stdout.write(self.style.WARNING(f"Processing {processed_count}/{total_funds}"))
                isin = fund.isin_growth
                url = f"https://mf.captnemo.in/kuvera/{isin}"
                try:
                    resp = requests.get(url, timeout=8)
                    if resp.status_code == 404:
                        self._mark_na(fund, isin, "404 Not Found")
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
                    kuvera_slug = api_fund.get("slug")
                    if kuvera_name and kuvera_slug:
                        fund.kuvera_name = kuvera_name
                        fund.kuvera_slug = kuvera_slug
                        fund.save(update_fields=["kuvera_name", "kuvera_slug"])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"ISIN {isin}: KuveraName → {kuvera_name}, KuveraSlug → {kuvera_slug}"
                            )
                        )
                    else:
                        self._mark_na(fund, isin, "No 'name' field in API response")

                except Exception as e:
                    self.stderr.write(f"Error for ISIN {isin}: {e}")

        # Record the end time
        end_time = time()
        elapsed_time = end_time - start_time

        # Calculate elapsed time in minutes and seconds
        elapsed_minutes = int(elapsed_time // 60)  # Get the total minutes
        elapsed_seconds = int(elapsed_time % 60)  # Get the remaining seconds
        self.stdout.write(
            self.style.SUCCESS(
                f"Script completed in {elapsed_minutes} minutes and {elapsed_seconds} seconds."
            )
        )
        
    def _mark_na(self, fund, isin, reason):
        # Mark kuvera_name as 'N/A' to skip on future runs
        fund.kuvera_name = NA_LABEL
        fund.save(update_fields=["kuvera_name"])
        self.stdout.write(
            self.style.WARNING(f"ISIN {isin}: {reason}. Marking as '{NA_LABEL}'.")
        )
