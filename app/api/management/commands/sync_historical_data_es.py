from django.core.management.base import BaseCommand
from django.conf import settings
from elasticsearch import Elasticsearch, NotFoundError
from api.models import FundHistoricalNAV, MutualFund
import time
from api.utils.xirr import xirr
from datetime import date, timedelta
from api.config.es_config import NAV_INDEX_NAME

class Command(BaseCommand):
    help = 'Intelligently syncs historical NAV data to Elasticsearch, one ISIN at a time.'

    def _calculate_returns(self, history, mutual_fund_obj):
        # ... (This helper function remains unchanged) ...
        if not history or not mutual_fund_obj.latest_nav or not mutual_fund_obj.latest_nav_date:
            return {}

        history.sort(key=lambda x: x['date'])
        
        latest_nav = float(mutual_fund_obj.latest_nav)
        latest_nav_date = mutual_fund_obj.latest_nav_date

        returns = {}
        return_windows = [
            ("xirr_6m", 182), ("xirr_1y", 365), ("xirr_3y", 1095),
            ("xirr_5y", 1825), ("xirr_10y", 3650), ("xirr_all", None)
        ]

        for key, days in return_windows:
            start_record = None
            if days is None:
                if history:
                    start_record = history[0]
            else:
                d0 = latest_nav_date - timedelta(days=days)
                for i in range(0, 31):
                    day_try_str = (d0 + timedelta(days=i)).isoformat()
                    record = next((r for r in history if r['date'] == day_try_str), None)
                    if record:
                        start_record = record
                        break
            
            if not start_record:
                returns[key] = None
                continue

            start_nav = float(start_record['nav'])
            start_date = date.fromisoformat(start_record['date'])

            try:
                if key == "xirr_6m":
                    if start_nav > 0:
                        simple_return = ((latest_nav - start_nav) / start_nav) * 100
                        returns[key] = round(simple_return, 2)
                    else:
                        returns[key] = None
                else:
                    values = [-start_nav, latest_nav]
                    dates = [start_date, latest_nav_date]
                    rate = xirr(cashflows=values, dates=dates)
                    returns[key] = rate
            except Exception:
                returns[key] = None
                
        return returns

    def handle(self, *args, **options):
        start_time = time.time()
        self.stdout.write("Starting intelligent NAV data sync with calculations...")
        
        es_host = getattr(settings, 'ELASTICSEARCH_HOST', 'http://elasticsearch:9200')
        index_name = NAV_INDEX_NAME
        es = Elasticsearch(es_host)

        if not es.indices.exists(index=index_name):
            self.stderr.write(self.style.ERROR(f"Index '{index_name}' does not exist. Run 'setup_es_index' first."))
            return

        # --- OPTIMIZATION: Fetch all funds into a dictionary for fast lookups ---
        self.stdout.write("Fetching all MutualFund objects into memory...")
        # Create a map of {isin: mutual_fund_object}
        mutual_funds_map = {
            mf.isin_growth: mf 
            for mf in MutualFund.objects.filter(isin_growth__isnull=False)
        }
        total_isins = len(mutual_funds_map)
        self.stdout.write(f"Found {total_isins} unique ISINs to process.")
        count = 0
        # --- Loop over the in-memory dictionary keys ---
        for i, isin in enumerate(mutual_funds_map.keys()):
            # Get the fund object from the dictionary (no DB query)
            mutual_fund_obj = mutual_funds_map[isin]

            self.stdout.write(f"Processing {i+1}/{total_isins}: {isin}...")
            
            existing_history = []
            last_updated_date = None
            try:
                doc = es.get(index=index_name, id=isin)
                last_updated_date = doc['_source']['last_updated_date']
                existing_history = doc['_source'].get('history', [])
            except NotFoundError:
                pass

            if last_updated_date:
                records_to_sync = FundHistoricalNAV.objects.filter(isin_growth=isin, date__gt=last_updated_date).order_by('date')
            else:
                records_to_sync = FundHistoricalNAV.objects.filter(isin_growth=isin).order_by('date')

            if not records_to_sync and last_updated_date:
                self.stdout.write(self.style.WARNING(f"  -> No new records. Skipping."))
                continue

            new_history_items = [{"date": rec.date.isoformat(), "nav": float(rec.nav)} for rec in records_to_sync]
            full_history = existing_history + new_history_items
            
            if not full_history:
                self.stdout.write(self.style.WARNING(f"  -> No historical data found for {isin}. Skipping."))
                continue

            calculated_returns = self._calculate_returns(full_history, mutual_fund_obj)
            new_last_updated_date = full_history[-1]['date']

            script = {
                "source": """
                    if (ctx._source.history == null) { ctx._source.history = []; }
                    ctx._source.history.addAll(params.new_history);
                    ctx._source.last_updated_date = params.new_date;
                    ctx._source.returns = params.new_returns;
                """,
                "lang": "painless",
                "params": {
                    "new_history": new_history_items,
                    "new_date": new_last_updated_date,
                    "new_returns": calculated_returns
                }
            }

            es.update(
                index=index_name,
                id=isin,
                script=script,
                upsert={
                    "isin": isin,
                    "last_updated_date": new_last_updated_date,
                    "history": full_history,
                    "returns": calculated_returns
                }
            )
            self.stdout.write(self.style.SUCCESS(f"  -> Synced {len(new_history_items)} new records and updated returns for {isin}."))
            count += 1

        end_time = time.time()
        minutes, seconds = divmod(int(end_time - start_time), 60)
        self.stdout.write(self.style.SUCCESS("Sync complete. A total of {} ISINs processed.".format(count)))
        self.stdout.write(self.style.SUCCESS(f"Total time taken: {minutes} minutes and {seconds} seconds."))