from rest_framework.permissions import BasePermission


class IsActiveUser(BasePermission):
    """
    Allows access only to active users.
    """

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_active
        )


class IsActiveCustomer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, "is_active", False))


class IsHoldingOwner(BasePermission):
    """
    Allows access only to the owner of the holding for any operation.
    """

    def has_object_permission(self, request, view, obj):
        # Only allow if the holding belongs to the requesting user
        return obj.user == request.user
