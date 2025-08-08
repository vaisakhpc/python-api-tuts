from django.core.management.base import BaseCommand
from django.utils.text import slugify
from api.models import MutualFund

BATCH_SIZE = 100


class Command(BaseCommand):
    help = "Update the slug field in the MutualFund model using the mf_name field."

    def handle(self, *args, **kwargs):
        query_set = MutualFund.objects.exclude(mf_name__isnull=True, mf_name__exact="")
        total_funds = query_set.count()
        self.stdout.write(self.style.WARNING(f"Total funds to process: {total_funds}"))

        processed_count = 0

        while True:
            # Fetch funds with non-empty mf_name in batches
            funds = query_set[:BATCH_SIZE]

            if not funds:
                self.stdout.write(self.style.SUCCESS("No more funds to process!"))
                break

            for fund in funds:
                processed_count += 1
                self.stdout.write(self.style.WARNING(f"Processing {processed_count}/{total_funds}"))

                # Generate slug from mf_name
                slug = slugify(fund.mf_name)

                # Save the slug to the database
                fund.slug = slug
                fund.save(update_fields=["slug"])

                self.stdout.write(
                    self.style.SUCCESS(f"Updated slug for fund {fund.isin_growth}: {slug}")
                )
                
            # Update the query_set to exclude already processed records    
            query_set = query_set.exclude(id__in=[fund.id for fund in funds])


        self.stdout.write(self.style.SUCCESS("Slug update completed!"))