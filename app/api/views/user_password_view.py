from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import User
from rest_framework.permissions import AllowAny
from django.utils import timezone


class SetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField()
    password = serializers.CharField()
    confirm_password = serializers.CharField()

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match.")
        return data


class SetPasswordView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]
        password = serializer.validated_data["password"]
        forgot = request.data.get("forgot", False)

        try:
            api_user = User.objects.get(email=email, reset_code=code)
            # Check expiry

            if not api_user.reset_expiry or api_user.reset_expiry < timezone.now():
                return Response(
                    {"detail": "Reset link has expired. Please request a new one."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not forgot and api_user.is_active:
                return Response(
                    {"detail": "User already activated."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            api_user.set_password(password)
            api_user.is_active = True
            api_user.reset_code = None  # Invalidate code
            api_user.reset_expiry = None
            api_user.save()
            return Response({"detail": "Password set successfully."})
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid link or user."}, status=status.HTTP_400_BAD_REQUEST
            )
