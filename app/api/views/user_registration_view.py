from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
import uuid
from api.models import User

def send_registration_email(api_user):
    reset_code = uuid.uuid4().hex
    api_user.reset_code = reset_code
    api_user.is_active = False
    api_user.save()
    link = f"https://yourdomain.com/set-password?code={reset_code}&email={api_user.email}"
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
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
