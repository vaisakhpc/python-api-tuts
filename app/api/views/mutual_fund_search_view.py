from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import MutualFund
from api.serializers.mutual_fund_serializer import MutualFundSerializer
from django.db.models import Q
from rest_framework.permissions import AllowAny

class MutualFundSearchView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)

    def get(self, request):
        query = request.query_params.get('q', '')  # e.g. /api/mutualfunds/search?q=axis
        funds = MutualFund.objects.filter(
            Q(mf_name__icontains=query)
        ).order_by('-AUM')

        # Group by type
        grouped = {}
        for fund in funds:
            fund_type = fund.type
            serialized = MutualFundSerializer(fund).data
            grouped.setdefault(fund_type, []).append(serialized)

        return Response({
            'status': 200,
            'data': grouped
        })
