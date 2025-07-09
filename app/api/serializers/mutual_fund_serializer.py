from rest_framework import serializers
from api.models import MutualFund

class MutualFundBulkListSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        # Use bulk_create for performance
        mutualfunds = [MutualFund(**item) for item in validated_data]
        return MutualFund.objects.bulk_create(mutualfunds)

class MutualFundSerializer(serializers.ModelSerializer):
    class Meta:
        model = MutualFund
        fields = ['id', 'mf_name', 'start_date', 'AUM', 'exit_load',
                  'expense_ratio', 'type']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
        list_serializer_class = MutualFundBulkListSerializer