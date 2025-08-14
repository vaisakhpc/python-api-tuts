from rest_framework import serializers
from api.models import Account


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "is_primary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_primary", "created_at", "updated_at"]

    def validate(self, attrs):
        # Ensure (user, name) is unique with a clear message
        request = self.context.get("request")
        user = getattr(request, "user", None)
        name = attrs.get("name")
        if not name and self.instance:
            name = getattr(self.instance, "name", None)
        if user is not None and name:
            qs = Account.objects.filter(user=user, name=name)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    "name": f"An account named '{name}' already exists. Choose a different name."
                })
        return attrs
