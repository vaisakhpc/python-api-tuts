from django.db import models

class FundHistoricalNAV(models.Model):
    isin_growth = models.CharField(max_length=20)  # or ForeignKey to MutualFund
    date = models.DateField()
    nav = models.DecimalField(max_digits=20, decimal_places=4)
    class Meta:
        unique_together = ('isin_growth', 'date')