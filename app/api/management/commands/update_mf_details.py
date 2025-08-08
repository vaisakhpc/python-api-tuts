import json
from django.core.management.base import BaseCommand
from api.models import MutualFund
import requests
from time import time
from datetime import datetime

BATCH_SIZE = 10


def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def parse_expense_ratio_history(api_data):
    """
    Extract or synthesize expense_ratio history from API response.
    Returns list of dicts with 'rate' and 'date'.
    """
    # There might be a history list in the API or a single rate.
    # Adjust based on actual API details; here, we create a single-entry list as example.
    rate = api_data.get("expense_ratio")
    # Assume we can get or set a date; fallback to today
    date_str = api_data.get("expense_ratio_date") or api_data.get("start_date")
    rate_date = parse_date(date_str) or datetime.today().date()

    try:
        rate_float = float(rate)
    except Exception:
        rate_float = None

    if rate_float is not None:
        return [{"rate": rate_float, "date": rate_date.isoformat()}]
    else:
        return []


class Command(BaseCommand):
    help = (
        "Update start_date, expense_ratio (as JSON list), and aum for all MutualFunds."
    )

    def handle(self, *args, **kwargs):
        # Record the start time
        start_time = time()
        exclude_isins = set()
        updated_isins = set()
        total_funds = MutualFund.objects.exclude(
            isin_growth__exact=""
        ).exclude(
            kuvera_name__isnull=True
        ).exclude(
            kuvera_name__exact="N/A"
        ).count()
        
        self.stdout.write(self.style.WARNING(f"Total funds to process: {total_funds}"))

        processed_count = 0
        
        while True:
            funds = (
                MutualFund.objects.exclude(isin_growth__in=exclude_isins)
                .exclude(isin_growth__in=updated_isins)
                .exclude(isin_growth__exact="")
                .exclude(kuvera_name__isnull=True)
                .exclude(kuvera_name__exact="N/A")[:BATCH_SIZE]
            )
            if not funds:
                self.stdout.write(
                    self.style.SUCCESS("All funds processed for metadata update!")
                )
                break

            for fund in funds:
                processed_count += 1
                self.stdout.write(
                    self.style.WARNING(f"Processing {processed_count}/{total_funds}")
                )
                
                isin = fund.isin_growth
                url = f"https://mf.captnemo.in/kuvera/{isin}"
                try:
                    resp = requests.get(url, timeout=8)
                    if resp.status_code == 404:
                        self.stdout.write(
                            self.style.WARNING(f"ISIN {isin}: 404 Not found. Skipped.")
                        )
                        exclude_isins.add(isin)
                        continue
                    data = resp.json()
                    if "error" in data:
                        self.stdout.write(
                            self.style.WARNING(
                                f"ISIN {isin}: {data['error']}. Skipped."
                            )
                        )
                        exclude_isins.add(isin)
                        continue

                    api_fund = None
                    if isinstance(data, list) and data and isinstance(data[0], dict):
                        api_fund = data[0]
                    elif isinstance(data, dict):
                        api_fund = data

                    if not api_fund:
                        self.stdout.write(
                            self.style.WARNING(
                                f"ISIN {isin}: No valid fund data in API response. Skipped."
                            )
                        )
                        exclude_isins.add(isin)
                        continue

                    # Parse fields
                    existing_expense_ratio_json = fund.expense_ratio or "[]"
                    try:
                        existing_expense_ratio_list = json.loads(
                            existing_expense_ratio_json
                        )
                    except Exception:
                        existing_expense_ratio_list = []

                    new_expense_ratio_list = parse_expense_ratio_history(api_fund)
                    combined_expense_ratio_list = (
                        existing_expense_ratio_list + new_expense_ratio_list
                    )
                    unique_dict = {}
                    for entry in combined_expense_ratio_list:
                        key = entry.get("date")
                        if key:
                            unique_dict[key] = entry
                    combined_expense_ratio_list = list(unique_dict.values())
                    expense_ratio_json = (
                        json.dumps(combined_expense_ratio_list)
                        if combined_expense_ratio_list
                        else None
                    )

                    start_date_val = parse_date(api_fund.get("start_date"))
                    aum_val = None
                    try:
                        aum_val = float(
                            api_fund.get("aum", api_fund.get("aum_in_crores", 0))
                        )  # adjust keys as per API
                    except Exception:
                        aum_val = None

                    updated_fields = []

                    if start_date_val:
                        fund.start_date = start_date_val
                        updated_fields.append("start_date")
                    if expense_ratio_json:
                        fund.expense_ratio = expense_ratio_json
                        updated_fields.append("expense_ratio")
                    if aum_val is not None:
                        fund.AUM = aum_val
                        updated_fields.append("AUM")
                    if api_fund.get("fund_type"):
                        fund.type = api_fund["fund_type"]
                        updated_fields.append("type")
                    if api_fund.get("fund_category"):
                        fund.category = api_fund["fund_category"]
                        updated_fields.append("category")

                    if updated_fields:
                        fund.save(update_fields=updated_fields)
                        updated_isins.add(isin)
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"ISIN {isin}: Updated fields: {', '.join(updated_fields)}"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"ISIN {isin}: No fields updated (empty API data)."
                            )
                        )

                except Exception as e:
                    self.stderr.write(f"Error for ISIN {isin}: {e}")
        
        # Record the end time
        end_time = time()
        elapsed_time = end_time - start_time
        # Calculate elapsed time in minutes and seconds
        elapsed_minutes = int(elapsed_time // 60)  # Get the total minutes
        elapsed_seconds = int(elapsed_time % 60)  # Get the remaining seconds

        # Display the total time taken in minutes and seconds
        self.stdout.write(
            self.style.SUCCESS(
                f"Script completed in {elapsed_minutes} minutes and {elapsed_seconds} seconds. "
                f"Total processed: {processed_count}/{total_funds}"
            )
        )
        
        if exclude_isins:
            self.stdout.write(
                self.style.WARNING(
                    f"Skipping {len(exclude_isins)} invalid ISIN(s): {', '.join(sorted(exclude_isins))}"
                )
            )
