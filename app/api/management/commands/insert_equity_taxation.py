from django.core.management.base import BaseCommand
from decimal import Decimal
from api.models import EquityTaxRates  # replace 'yourapp' accordingly


class Command(BaseCommand):
    help = "Create Equity Tax Rates for 2025 with specified LTCG, STCG rates and exemptions."

    def handle(self, *args, **kwargs):
        year = 2025
        ltcg_rate = Decimal('12.5')
        stcg_rate = Decimal('20')
        ltcg_exemption = Decimal('125000')
        stcg_exemption = Decimal('0')
        holding_period_days = 365

        # Delete existing records for year if any (optional)
        EquityTaxRates.objects.filter(year=year).delete()

        # Create new record
        tax_rates = EquityTaxRates.objects.create(
            year=year,
            ltcg_rate_percent=ltcg_rate,
            stcg_rate_percent=stcg_rate,
            ltcg_exemption_limit=ltcg_exemption,
            stcg_exemption_limit=stcg_exemption,
            ltcg_holding_period_days=holding_period_days,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Equity Tax Rates for year {year} created successfully:\n"
                f"LTCG Rate: {ltcg_rate}%, LTCG Exemption: ₹{ltcg_exemption}\n"
                f"STCG Rate: {stcg_rate}%, STCG Exemption: ₹{stcg_exemption}\n"
                f"Holding Period for LTCG: {holding_period_days} days"
            )
        )
