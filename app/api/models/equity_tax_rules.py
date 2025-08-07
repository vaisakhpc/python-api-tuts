from django.db import models
from decimal import Decimal


class EquityTaxRates(models.Model):
    year = models.PositiveIntegerField(
        unique=True, help_text="Financial year (e.g., 2025)"
    )
    ltcg_rate_percent = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="LTCG Tax Rate (%) for equities"
    )
    stcg_rate_percent = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="STCG Tax Rate (%) for equities"
    )
    ltcg_exemption_limit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("125000.00"),
        help_text="Exemption for LTCG (annual, e.g., 1.25L)",
    )
    stcg_exemption_limit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Exemption for STCG (annual, default 0 unless law changes)",
    )
    ltcg_holding_period_days = models.PositiveIntegerField(
        default=365, help_text="Minimum holding period in days for LTCG on equities"
    )

    class Meta:
        ordering = ["year"]
        verbose_name = "Equity Tax Rates"
        verbose_name_plural = "Equity Tax Rates"

    def __str__(self):
        return f"Equity Tax {self.year}: LTCG {self.ltcg_rate_percent}%, STCG {self.stcg_rate_percent}%"
