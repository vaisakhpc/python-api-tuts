from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
import uuid
from api.models import User
from django.conf import settings
import datetime
from rest_framework.permissions import AllowAny

def send_registration_email(api_user):
    reset_code = uuid.uuid4().hex
    api_user.reset_code = reset_code
    api_user.is_active = False
    api_user.reset_expiry = datetime.datetime.now() + datetime.timedelta(hours=24)
    api_user.save()
    fe_host = getattr(settings, "FRONTEND_URL", "http://localhost:8080")
    link = (
        f"{fe_host}/set-password?code={reset_code}&email={api_user.email}"
    )
    send_mail(
        subject="Set your password",
        message=f"Hi {api_user.name}, your link to create your password is here: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[api_user.email],
    )


class ResendRegistrationEmailView(APIView):
    def post(self, request):
        email = request.data.get("email")
        try:
            api_user = User.objects.get(email=email)
            send_registration_email(api_user)
            return Response({"detail": "Registration email sent."})
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )

def send_forgot_password_email(api_user):
    reset_code = uuid.uuid4().hex
    api_user.reset_code = reset_code
    api_user.reset_expiry = datetime.datetime.now() + datetime.timedelta(hours=24)
    api_user.save()
    fe_host = getattr(settings, "FRONTEND_URL", "http://localhost:8080")
    link = (
        f"{fe_host}/set-password?code={reset_code}&email={api_user.email}&forgot=1"
    )
    send_mail(
        subject="Reset your password",
        message=f"Hi {api_user.name}, your link to reset your password is here: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[api_user.email],
    )

class ForgotPasswordEmailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get("email")
        try:
            api_user = User.objects.get(email=email)
            send_forgot_password_email(api_user)
            return Response({"detail": "Password reset email sent."})
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )
