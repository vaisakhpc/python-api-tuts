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
import os

def render_email_template(template_path, context):
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    for key, value in context.items():
        template = template.replace(f'{{{{{key}}}}}', str(value))
    return template


def send_registration_email(api_user):
    reset_code = uuid.uuid4().hex
    api_user.reset_code = reset_code
    api_user.is_active = False
    expiry_hours = int(os.environ.get("RESET_EXPIRY_HOURS", 24))
    api_user.reset_expiry = datetime.datetime.now() + datetime.timedelta(hours=expiry_hours)
    api_user.save()
    fe_host = getattr(settings, "FRONTEND_URL", "http://localhost:8080")
    link = f"{fe_host}/set-password?code={reset_code}&email={api_user.email}"
    context = {
        "name": api_user.name,
        "link": link,
        "expiry_hours": expiry_hours,
        "year": datetime.datetime.now().year
    }
    html_message = render_email_template(
        os.path.join(os.path.dirname(__file__), '../email_templates/registration_email.html'),
        context
    )
    send_mail(
        subject="Set your password",
        message=f"Hi {api_user.name}, your link to create your password is here: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[api_user.email],
        html_message=html_message,
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
    expiry_hours = int(os.environ.get("RESET_EXPIRY_HOURS", 24))
    api_user.reset_expiry = datetime.datetime.now() + datetime.timedelta(hours=expiry_hours)
    api_user.save()
    fe_host = getattr(settings, "FRONTEND_URL", "http://localhost:8080")
    link = f"{fe_host}/set-password?code={reset_code}&email={api_user.email}&forgot=1"
    context = {
        "name": api_user.name,
        "link": link,
        "expiry_hours": expiry_hours,
        "year": datetime.datetime.now().year
    }
    html_message = render_email_template(
        os.path.join(os.path.dirname(__file__), '../email_templates/forgot_password_email.html'),
        context
    )
    send_mail(
        subject="Reset your password",
        message=f"Hi {api_user.name}, your link to reset your password is here: {link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[api_user.email],
        html_message=html_message,
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
