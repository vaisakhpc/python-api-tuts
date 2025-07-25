from django.db import models
from .user import User
from .mutual_fund import MutualFund
from django.utils import timezone

class MFHolding(models.Model):
    TYPE_BUY = 'BUY'
    TYPE_SELL = 'SELL'
    TRANSACTION_TYPE_CHOICES = [
        (TYPE_BUY, 'Buy'),
        (TYPE_SELL, 'Sell'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='holdings')
    fund = models.ForeignKey(MutualFund, on_delete=models.CASCADE, related_name='holdings')
    type = models.CharField(max_length=4, choices=TRANSACTION_TYPE_CHOICES, default='BUY')
    units = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    nav = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    transacted_at = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user', 'fund', 'transacted_at', 'id']

    def __str__(self):
        return (
            f"{self.user} - {self.fund.mf_name} - "
            f"{self.type} {self.units} @ {self.nav} on {self.transacted_at}"
        )
