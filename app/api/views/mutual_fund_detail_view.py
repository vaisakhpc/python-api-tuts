from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from api.models import MutualFund
from api.serializers.mutual_fund_detail_serializer import MutualFundDetailSerializer
from rest_framework.permissions import AllowAny
from django.conf import settings
from elasticsearch import Elasticsearch, NotFoundError
import logging
from api.config.es_config import MUTUALFUND_INDEX_NAME


class MutualFundDetailView(RetrieveAPIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)
    serializer_class = MutualFundDetailSerializer
    lookup_field = "isin_growth"

    def get_queryset(self):
        return MutualFund.objects.all()

    def get_object(self):
        qs = self.get_queryset()
        isin = self.kwargs.get("isin_growth")
        mf_scheme_code = self.kwargs.get("mf_scheme_code")
        if isin:
            return qs.get(isin_growth=isin)
        elif mf_scheme_code:
            return qs.get(mf_schema_code=mf_scheme_code)
        raise Exception("Must provide isin_growth or mf_scheme_code")

    def retrieve(self, request, *args, **kwargs):
        es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://elasticsearch:9200")
        index_name = MUTUALFUND_INDEX_NAME
        es = Elasticsearch(es_host)

        # Set up logging
        logger = logging.getLogger(__name__)

        isin = self.kwargs.get("isin_growth")
        mf_scheme_code = self.kwargs.get("mf_scheme_code")

        # Attempt to fetch from Elasticsearch
        try:
            if isin:
                doc = es.get(index=index_name, id=isin)
            elif mf_scheme_code:
                # If mf_scheme_code is provided, search by it
                query = {"query": {"term": {"mf_schema_code": mf_scheme_code}}}
                search_result = es.search(index=index_name, body=query)
                if search_result["hits"]["total"]["value"] > 0:
                    doc = search_result["hits"]["hits"][0]
                else:
                    raise NotFoundError

            # Return the Elasticsearch document
            return Response(doc["_source"])

        except:
            # Fallback to database if not found in Elasticsearch
            logger.warning(
                f"Document not found in Elasticsearch for {isin or mf_scheme_code}. Falling back to database."
            )
            obj = self.get_object()
            serializer = self.get_serializer(obj)
            return Response(serializer.data)
