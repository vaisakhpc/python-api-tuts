from django.core.management.base import BaseCommand
from django.conf import settings
from elasticsearch import Elasticsearch

# Import mappings for multiple indices
from api.config.es_config import (
    NAV_INDEX_NAME,
    NAV_INDEX_MAPPING,
    MUTUALFUND_INDEX_NAME,
    MUTUALFUND_INDEX_MAPPING,
)


class Command(BaseCommand):
    """
    Django management command to create or recreate multiple Elasticsearch indices.
    Run with: python manage.py setup_es_indices
    Use --recreate to delete and recreate the indices.
    """

    help = "Creates or recreates Elasticsearch indices for NAV and MutualFund data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--recreate",
            action="store_true",
            help="Delete and recreate the indices if they already exist.",
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up Elasticsearch indices...")

        es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://localhost:9201")

        try:
            es = Elasticsearch(es_host)
            es.info()
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(
                    f"Could not connect to Elasticsearch at {es_host}: {e}"
                )
            )
            return

        # Define indices and their mappings
        indices = [
            {"name": NAV_INDEX_NAME, "mapping": NAV_INDEX_MAPPING},
            {"name": MUTUALFUND_INDEX_NAME, "mapping": MUTUALFUND_INDEX_MAPPING},
        ]

        for index in indices:
            index_name = index["name"]
            index_mapping = index["mapping"]

            index_exists = es.indices.exists(index=index_name)

            if index_exists and options["recreate"]:
                self.stdout.write(
                    self.style.WARNING(f"Recreating index: Deleting '{index_name}'...")
                )
                es.indices.delete(index=index_name)
                index_exists = False

            if not index_exists:
                self.stdout.write(f"Creating index '{index_name}'...")
                es.indices.create(index=index_name, body=index_mapping)
                self.stdout.write(
                    self.style.SUCCESS(f"Index '{index_name}' created successfully.")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Index '{index_name}' already exists. No action taken."
                    )
                )
