# api/serializers/mfholding_serializer.py

from rest_framework import serializers
from api.models import MFHolding


class MFHoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MFHolding
        fields = [
            "id",
            "fund",
            "nav",
            "units",
            "type",
            "transacted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
