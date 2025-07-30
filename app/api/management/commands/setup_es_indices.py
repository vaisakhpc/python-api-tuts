from django.core.management.base import BaseCommand
from django.conf import settings
from elasticsearch import Elasticsearch

# Adjust the import path based on your app's name
from api.config.es_config import NAV_INDEX_MAPPING

class Command(BaseCommand):
    """
    Django management command to create the Elasticsearch index with the correct mapping.
    Run with: python manage.py setup_es_index
    Use --recreate to delete and recreate the index.
    """
    help = 'Creates the Elasticsearch index for historical NAV data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recreate',
            action='store_true',
            help='Delete and recreate the index if it already exists.',
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up Elasticsearch index...")

        es_host = getattr(settings, 'ELASTICSEARCH_HOST', 'http://localhost:9201')
        index_name = "fund_nav_history"

        try:
            es = Elasticsearch(es_host)
            es.info()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Could not connect to Elasticsearch at {es_host}: {e}"))
            return

        index_exists = es.indices.exists(index=index_name)

        if index_exists and options['recreate']:
            self.stdout.write(self.style.WARNING(f"Recreating index: Deleting '{index_name}'..."))
            es.indices.delete(index=index_name)
            index_exists = False

        if not index_exists:
            self.stdout.write(f"Creating index '{index_name}'...")
            es.indices.create(index=index_name, body=NAV_INDEX_MAPPING)
            self.stdout.write(self.style.SUCCESS(f"Index '{index_name}' created successfully."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Index '{index_name}' already exists. No action taken."))