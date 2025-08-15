from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer


class ImportMappingView(APIView):
    """Return the authenticated user's saved self-import column mapping.

    Auth: expects a user JWT (same as MFHoldingViewSet).
    """

    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer]

    def get(self, request):
        mapping = getattr(request.user, "config_import_mapping", None) or {}
        return Response({"statusCode": 200, "data": {"mapping": mapping}}, status=status.HTTP_200_OK)
