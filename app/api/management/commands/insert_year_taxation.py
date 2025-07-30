from django.core.management.base import BaseCommand
from decimal import Decimal
from api.models import IncomeTaxYear, IncomeTaxSlab  # replace 'yourapp' with your actual app name


class Command(BaseCommand):
    help = "Creates Income Tax Year 2025 and inserts slabs for FY 2025-26 (AY 2026-27) as per Feb 2025 Union Budget"

    def handle(self, *args, **kwargs):
        year = 2025
        # Effective income exemption limit under new regime with rebate (~12L)
        exemption_limit = Decimal('1200000')  # ₹12,00,000 (approximate effective exemption)

        # Clean up existing entries if any (optional)
        IncomeTaxSlab.objects.filter(tax_year__year=year).delete()
        IncomeTaxYear.objects.filter(year=year).delete()

        # Create the tax year entry
        tax_year = IncomeTaxYear.objects.create(
            year=year,
            exemption_limit=exemption_limit
        )

        # New regime slabs for FY 2025-26 as per Union Budget Feb 2025
        slabs = [
            {"upper_income_limit": Decimal('400000'), "tax_rate_percent": Decimal('0')},   # Up to 4L: 0%
            {"upper_income_limit": Decimal('800000'), "tax_rate_percent": Decimal('5')},   # 4L - 8L: 5%
            {"upper_income_limit": Decimal('1200000'), "tax_rate_percent": Decimal('10')}, # 8L - 12L: 10%
            {"upper_income_limit": Decimal('1600000'), "tax_rate_percent": Decimal('15')}, # 12L - 16L: 15%
            {"upper_income_limit": Decimal('2000000'), "tax_rate_percent": Decimal('20')}, # 16L - 20L: 20%
            {"upper_income_limit": Decimal('2400000'), "tax_rate_percent": Decimal('25')}, # 20L - 24L: 25%
            {"upper_income_limit": None, "tax_rate_percent": Decimal('30')},               # Above 24L: 30%
        ]

        # Insert slabs into DB
        for slab in slabs:
            IncomeTaxSlab.objects.create(
                tax_year=tax_year,
                upper_income_limit=slab["upper_income_limit"],
                tax_rate_percent=slab["tax_rate_percent"]
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Added slab: Up to ₹{slab['upper_income_limit'] or '∞'} at {slab['tax_rate_percent']}%"
                )
            )

        self.stdout.write(self.style.SUCCESS(f"Successfully created Income Tax Year {year} and slabs for FY 2025-26."))
