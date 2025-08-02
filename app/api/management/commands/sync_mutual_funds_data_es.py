from django.core.management.base import BaseCommand
from django.conf import settings
from elasticsearch import Elasticsearch, NotFoundError
from api.models import MutualFund
from api.serializers.mutual_fund_detail_serializer import MutualFundDetailSerializer
import time
from api.config.es_config import MUTUALFUND_INDEX_NAME

class Command(BaseCommand):
    help = 'Sync MutualFund data to Elasticsearch.'

    def handle(self, *args, **options):
        start_time = time.time()
        es_host = getattr(settings, 'ELASTICSEARCH_HOST', 'http://elasticsearch:9200')
        index_name = MUTUALFUND_INDEX_NAME
        es = Elasticsearch(es_host)

        if not es.indices.exists(index=index_name):
            self.stderr.write(self.style.ERROR(f"Index '{index_name}' does not exist. Run 'setup_es_indices' first."))
            return

        mutual_funds = MutualFund.objects.all()
        for fund in mutual_funds:
            # Use the serializer to calculate XIRRs
            serializer = MutualFundDetailSerializer(fund)
            returns_xirr = serializer.get_returns_xirr(fund, False)

            # Prepare the document for Elasticsearch
            doc = {
                "isin": fund.isin_growth,
                "mf_name": fund.mf_name,
                "mf_schema_code": fund.mf_schema_code,
                "start_date": fund.start_date.isoformat() if fund.start_date else None,
                "aum": float(fund.AUM) if fund.AUM else None,
                "exit_load": fund.exit_load,
                "expense_ratio": fund.expense_ratio if fund.expense_ratio else None,
                "type": fund.type,
                "latest_nav": float(fund.latest_nav) if fund.latest_nav else None,
                "latest_nav_date": fund.latest_nav_date.isoformat() if fund.latest_nav_date else None,
                "returns": returns_xirr  # Use the calculated XIRRs
            }

            try:
                # Index the document in Elasticsearch (overwrite if exists)
                es.index(index=index_name, id=fund.isin_growth, body=doc)
                self.stdout.write(self.style.SUCCESS(f"Synced MutualFund: {fund.mf_name} (ISIN: {fund.isin_growth})"))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to sync MutualFund: {fund.mf_name} (ISIN: {fund.isin_growth}). Error: {e}"))
                
        end_time = time.time()
        minutes, seconds = divmod(int(end_time - start_time), 60)
        self.stdout.write(self.style.SUCCESS(f"Elasticsearch data sync completed in {minutes}m {seconds}s."))
