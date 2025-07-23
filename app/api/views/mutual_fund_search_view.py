from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import MutualFund
from api.serializers.mutual_fund_serializer import MutualFundSerializer
from django.db.models import Q
from rest_framework.permissions import AllowAny
from api.mixins import PaginationMixin
from api.pagination import StandardResultsSetPagination

class MutualFundSearchView(PaginationMixin, APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        query = request.query_params.get('q', '')  # e.g. /api/mutualfunds/search?q=axis
        funds = MutualFund.objects.filter(
            Q(mf_name__icontains=query)
        ).order_by('-AUM')

        page = self.paginate_queryset(funds)

        grouped = {}
        for fund in page:
            fund_type = fund.type
            serialized = MutualFundSerializer(fund).data
            grouped.setdefault(fund_type, []).append(serialized)
        return self.get_paginated_response(grouped)
