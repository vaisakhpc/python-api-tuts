from rest_framework import viewsets
from api.models import MFHolding
from api.serializers.mfholding_serializer import MFHoldingSerializer
from api.authentication import CustomerUUIDAuthentication
from api.permissions import IsActiveCustomer, IsHoldingOwner

class MFHoldingViewSet(viewsets.ModelViewSet):
    serializer_class = MFHoldingSerializer
    authentication_classes = [CustomerUUIDAuthentication]
    permission_classes = [IsActiveCustomer, IsHoldingOwner]

    def get_queryset(self):
        return MFHolding.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
