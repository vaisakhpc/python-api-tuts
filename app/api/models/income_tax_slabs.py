from django.db import models
from decimal import Decimal

class IncomeTaxYear(models.Model):
    year = models.PositiveIntegerField(unique=True, help_text="Tax year (e.g., 2025)")
    exemption_limit = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('0.00'),
        help_text="Annual total income exemption limit"
    )

    class Meta:
        ordering = ['year']
        verbose_name = "Income Tax Year"
        verbose_name_plural = "Income Tax Years"

    def __str__(self):
        return f"Income Tax Year {self.year}"


class IncomeTaxSlab(models.Model):
    tax_year = models.ForeignKey(
        IncomeTaxYear,
        on_delete=models.CASCADE,
        related_name='slabs',
        help_text="Tax year this slab belongs to"
    )
    upper_income_limit = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text="Upper income limit for this slab. Null if no upper limit (top slab)"
    )
    tax_rate_percent = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Tax rate (percentage) for this slab"
    )

    class Meta:
        ordering = ['upper_income_limit']
        verbose_name = "Income Tax Slab"
        verbose_name_plural = "Income Tax Slabs"

    def __str__(self):
        if self.upper_income_limit is not None:
            return f"Up to ₹{self.upper_income_limit}: {self.tax_rate_percent}%"
        else:
            return f"Above slab income: {self.tax_rate_percent}%"
