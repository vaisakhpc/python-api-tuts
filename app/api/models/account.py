from django.db import models
from .user import User


class Account(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accounts")
    name = models.CharField(max_length=100)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user", "-is_primary", "created_at", "id"]
        unique_together = (
            ("user", "name"),
        )

    def __str__(self) -> str:
        return f"{self.user} - {self.name}{' (primary)' if self.is_primary else ''}"
