from rest_framework import viewsets, permissions, status
from api.models import MutualFund
from api.serializers.mutual_fund_serializer import MutualFundSerializer
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        # Allow safe methods to any authenticated user, restrict write to staff
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff

class MutualFundViewSet(viewsets.ModelViewSet):
    serializer_class = MutualFundSerializer
    permission_classes = [IsAdminOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        # Only show mutual funds created by the current admin user
        return MutualFund.objects.filter(created_by=self.request.user)
    
    def get_object(self):
        obj = super().get_object()
        # Only allow editing/deleting if the current user is the creator
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            if obj.created_by != self.request.user:
                raise PermissionDenied("You can only view, edit or delete funds created by you.")
        return obj

    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)