from rest_framework import serializers
from api.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["name", "email", "age"]
        read_only_fields = ["id", "created_at", "updated_at"]