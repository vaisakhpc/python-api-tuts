from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from ..models import User
from ..serializers import UserSerializer
from ..permissions import IsActiveUser
from django.core.mail import send_mail
from django.conf import settings
from api.views.user_registration_view import send_registration_email
from rest_framework.exceptions import ValidationError


class UserViewSet(viewsets.ViewSet):
    """
    A ViewSet for listing, creating, updating, and deleting users.
    """

    def get_permissions(self):
        if self.action == 'create':
            return []
        return [IsActiveUser()]

    def list(self, request):
        # GET /users/ or GET /users/?email=...
        email = request.query_params.get("email")
        search = request.query_params.get("search")

        if email:
            user = get_object_or_404(User, email=email)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        if search:
            users = User.objects.filter(name__icontains=search)
            serializer = UserSerializer(users, many=True)
            return Response(serializer.data)

        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def create(self, request):
        # POST /users/
        serializer = UserSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            error_details = exc.detail
            # Check for user exists error
            if "email" in error_details and "already exists" in str(error_details["email"]):
                return Response(
                    {
                        "statusCode": 400,
                        "errorMessage": {
                            "message": "User with this email already exists.",
                            "reason": "user_exists",
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Check for missing field error
            for field, messages in error_details.items():
                if "This field is required." in messages:
                    return Response(
                        {
                            "statusCode": 400,
                            "errorMessage": {
                                "message": f"{field} field is required.",
                                "reason": "missing_field",
                                "field": field
                            },
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            # Default error response
            return Response(
                {
                    "statusCode": 400,
                    "errorMessage": {
                        "message": str(error_details),
                        "reason": "validation_error"
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = serializer.save()

        # Send registration email (only for newly created users)
        send_registration_email(user)

        return Response(
            {"result": "success", "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        # PUT /users/<pk>/
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"result": "success", "data": serializer.data})

    def partial_update(self, request, pk=None):
        # PATCH /users/<pk>/
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"result": "success", "data": serializer.data})

    def destroy(self, request, pk=None):
        # DELETE /users/<pk>/
        user = get_object_or_404(User, pk=pk)
        user.delete()
        return Response(
            {"result": "success", "message": "User deleted"},
            status=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=False, methods=["put"], url_path="update_by_email")
    def update_by_email(self, request):
        # PUT /users/update_by_email/?email=...
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"result": "error", "message": "Email parameter is missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_object_or_404(User, email=email)
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"result": "success", "data": serializer.data})

    @action(detail=False, methods=["delete"], url_path="delete_by_email")
    def delete_by_email(self, request):
        # DELETE /users/delete_by_email/?email=...
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"result": "error", "message": "Email parameter is missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_object_or_404(User, email=email)
        user.delete()
        return Response(
            {"result": "success", "message": "User deleted"},
            status=status.HTTP_204_NO_CONTENT,
        )
