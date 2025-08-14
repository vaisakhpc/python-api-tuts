from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from api.models import Account
from api.serializers.account_serializer import AccountSerializer
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer
from django.db import transaction
from django.db.models import ProtectedError
from django.db import IntegrityError


class AccountViewSet(viewsets.ModelViewSet):
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer]
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user).order_by("-is_primary", "name", "id")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                is_first = not Account.objects.filter(user=request.user).exists()
                instance = serializer.save(user=request.user, is_primary=is_first)
        except IntegrityError as e:
            # Likely unique (user, name) violation
            return Response(
                {"statusCode": 400, "errorMessage": "An account with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        headers = self.get_success_headers(AccountSerializer(instance).data)
        return Response(AccountSerializer(instance).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                self.perform_update(serializer)
        except IntegrityError:
            return Response(
                {"statusCode": 400, "errorMessage": "An account with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Do not allow deleting the last remaining account for this user
        has_other_accounts = Account.objects.filter(user=request.user).exclude(pk=instance.pk).exists()
        if not has_other_accounts:
            return Response(
                {"statusCode": 400, "errorMessage": "You must have at least one account. Cannot delete your only account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Prevent deleting account when holdings reference it
        try:
            self.perform_destroy(instance)
        except ProtectedError:
            return Response(
                {"statusCode": 400, "errorMessage": "Cannot delete this account because some holdings are linked to it. Move or delete those transactions first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # If primary was deleted, promote the oldest remaining as primary
        if instance.is_primary:
            next_acc = Account.objects.filter(user=request.user).order_by("created_at").first()
            if next_acc:
                next_acc.is_primary = True
                next_acc.save(update_fields=["is_primary"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def make_primary(self, request, pk=None):
        # Explicitly set this account as primary for the user
        acc = self.get_object()
        # Idempotent: if already primary, just return current state
        if acc.is_primary:
            return Response(AccountSerializer(acc).data, status=status.HTTP_200_OK)
        with transaction.atomic():
            # Unmark any existing primary for this user, then mark this one
            Account.objects.filter(user=request.user, is_primary=True).update(is_primary=False)
            acc.is_primary = True
            acc.save(update_fields=["is_primary"])
        return Response(AccountSerializer(acc).data, status=status.HTTP_200_OK)
