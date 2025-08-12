from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers
from django.contrib.auth.hashers import check_password
from rest_framework_simplejwt.tokens import RefreshToken
from api.models import User
from rest_framework.permissions import AllowAny


class UserTokenObtainSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class UserTokenObtainView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)

    def post(self, request):
        serializer = UserTokenObtainSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        try:
            user = User.objects.get(email=email, is_active=True)
            if check_password(password, user.password):
                refresh = RefreshToken.for_user(user)
                return Response(
                    {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                        "name": user.name,
                    }
                )
        except User.DoesNotExist:
            pass
        return Response(
            {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
        )


class UserTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class UserTokenRefreshView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)

    def post(self, request):
        serializer = UserTokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(serializer.validated_data["refresh"])
            return Response(
                {
                    "access": str(refresh.access_token),
                }
            )
        except Exception:
            return Response(
                {"detail": "Invalid refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
