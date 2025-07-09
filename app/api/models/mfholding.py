from django.db import models
from .user import User
from .mutual_fund import MutualFund

class MFHolding(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='holdings')
    holding_id = models.CharField(max_length=100, unique=True)
    fund = models.ForeignKey(MutualFund, on_delete=models.CASCADE, related_name='holdings')
    NAV = models.DecimalField(max_digits=12, decimal_places=4)
    units = models.DecimalField(max_digits=12, decimal_places=4)
    purchased_at = models.DateField()
    sold_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sold_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Holding {self.holding_id} - {self.fund.mf_name}"
