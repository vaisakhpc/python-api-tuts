from django.db import models
from django.conf import settings

class MutualFund(models.Model):
    FUND_TYPE_CHOICES = [
        ('Debt', 'Debt'),
        ('Equity', 'Equity'),
        ('Hybrid', 'Hybrid'),
        ('Others', 'Others'),
    ]

    id = models.AutoField(primary_key=True)
    mf_name = models.CharField(max_length=255)
    mf_schema_code = models.IntegerField()
    start_date = models.DateField(null=False, blank=False)
    AUM = models.DecimalField(max_digits=20, decimal_places=2)
    exit_load = models.CharField(max_length=255)
    expense_ratio = models.DecimalField(max_digits=5, decimal_places=2)
    type = models.CharField(max_length=10, choices=FUND_TYPE_CHOICES)
    latest_nav = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    latest_nav_date = models.DateField(null=True, blank=True)
    isin_growth = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_mutualfunds',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    nav_last_updated = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.mf_name
