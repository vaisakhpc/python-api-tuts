import uuid
from django.db import models


class User(models.Model):
    """
    User model for the API. This model is stored in the database.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200, blank=False, null=False)
    email = models.EmailField(max_length=200, unique=True, blank=False, null=False)
    age = models.IntegerField(null=False, blank=False)

    class Meta:
        app_label = "api"
