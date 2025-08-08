from django.db import models
from django.conf import settings


class MutualFund(models.Model):
    id = models.AutoField(primary_key=True)
    mf_name = models.CharField(max_length=255)
    mf_schema_code = models.IntegerField()
    start_date = models.DateField(null=False, blank=False)
    AUM = models.DecimalField(max_digits=20, decimal_places=2)
    exit_load = models.CharField(max_length=255)
    expense_ratio = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    latest_nav = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True
    )
    latest_nav_date = models.DateField(null=True, blank=True)
    isin_growth = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_mutualfunds",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    nav_last_updated = models.DateTimeField(null=True, blank=True)
    kuvera_name = models.CharField(max_length=255, null=True, blank=True)
    kuvera_slug = models.CharField(max_length=255, null=True, blank=True)
    slug = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.mf_name
