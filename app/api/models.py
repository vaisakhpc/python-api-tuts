import uuid
from django.db import models
from django.contrib.auth.hashers import make_password

class User(models.Model):
    """
    User model for the API. This model is stored in the database.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200, blank=False, null=False)
    email = models.EmailField(max_length=200, unique=True, blank=False, null=False)
    password = models.CharField(max_length=128, blank=True)  # hashed password
    age = models.IntegerField(null=False, blank=False)
    is_active = models.BooleanField(default=False)
    reset_code = models.CharField(max_length=64, blank=True, null=True)
    def set_password(self, raw_password):
        self.password = make_password(raw_password)
        self.save()
    class Meta:
        app_label = "api"
