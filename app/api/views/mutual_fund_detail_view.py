# views.py
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from api.models import MutualFund
from api.serializers.mutual_fund_detail_serializer import MutualFundDetailSerializer
from rest_framework.permissions import AllowAny

class MutualFundDetailView(RetrieveAPIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)
    serializer_class = MutualFundDetailSerializer
    lookup_field = 'isin_growth'

    def get_queryset(self):
        return MutualFund.objects.all()

    # Optionally support lookup by either isin_growth or mf_schema_code
    def get_object(self):
        qs = self.get_queryset()
        isin = self.kwargs.get('isin_growth')
        mf_scheme_code = self.kwargs.get('mf_scheme_code')
        if isin:
            return qs.get(isin_growth=isin)
        elif mf_scheme_code:
            return qs.get(mf_schema_code=mf_scheme_code)
        raise Exception('Must provide isin_growth or mf_scheme_code')
