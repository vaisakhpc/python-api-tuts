# api/serializers/mfholding_serializer.py

from rest_framework import serializers
from api.models import MFHolding

class MFHoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MFHolding
        fields = ['id', 'holding_id', 'fund', 'NAV', 'units', 'purchased_at',
                  'sold_price', 'sold_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
