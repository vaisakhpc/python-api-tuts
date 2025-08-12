from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import MutualFund
from api.serializers.mutual_fund_serializer import MutualFundSerializer
from django.db.models import Q
from rest_framework.permissions import AllowAny
from api.mixins import PaginationMixin
from api.pagination import StandardResultsSetPagination
from django.conf import settings
from elasticsearch import Elasticsearch, NotFoundError, ConnectionError
from api.config.es_config import MUTUALFUND_INDEX_NAME
import traceback
import logging


class MutualFundSearchView(PaginationMixin, APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user (even unauthenticated)
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        # Set up logging
        logger = logging.getLogger(__name__)
        query = request.query_params.get("q", "")  # e.g. /api/mutualfunds/search?q=axis

        if not query or len(query) < 3:
            return Response(
                {"error": "Query must be at least 3 characters long."}, status=400
            )
        es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://elasticsearch:9200")
        es = Elasticsearch(es_host)

        try:
            # Get pagination parameters for Elasticsearch
            from_, size = self.get_es_pagination_params(request)

            # Determine if the query is an integer
            is_integer = query.isdigit()

            # Search in Elasticsearch
            es_query = {
                "query": {
                    "bool": {
                        "should": [
                            {
                                "match_phrase_prefix": {
                                "mf_name": {
                                    "query": query,
                                    "boost": 3,  # Boost 'mf_name' field
                                }
                            }
                            },
                            {"term": {"isin": query}},  # Exact match for ISIN
                        ]
                    }
                },
                "sort": [{"aum": {"order": "desc"}}],  # Sort by AUM in descending order
                "from": from_,  # Pagination start
                "size": size,  # Number of results per page
            }

            # Add the mf_schema_code query only if the input is an integer
            if is_integer:
                es_query["query"]["bool"]["should"].append(
                    {"term": {"mf_schema_code": int(query)}}
                )

            es_response = es.search(index=MUTUALFUND_INDEX_NAME, body=es_query)

            print(f"Elasticsearch query: {es_query}")  # Debugging output
            print(f"Elasticsearch response: {es_response}")  # Debugging output

            # Extract results from Elasticsearch response
            funds = [hit["_source"] for hit in es_response["hits"]["hits"]]

            # Paginate Elasticsearch results
            paginated_data = self.paginate_es_results(es_response, request)

            # Group results by type
            grouped = {}
            for fund in paginated_data["results"]:
                fund_type = fund.get("type", "Unknown")
                grouped.setdefault(fund_type, []).append(fund)

            # Return the paginated response with grouped results
            return Response(
                {
                    "count": paginated_data["count"],
                    "current_count": paginated_data["current_count"],
                    "next": paginated_data["next"],
                    "previous": paginated_data["previous"],
                    "results": grouped,
                }
            )

        except (NotFoundError, ConnectionError, Exception) as e:
            logger.warning(
                f"Error during Elasticsearch search: {e}. Falling back to database."
            )
            if isinstance(e, (ConnectionError, Exception)):
                logger.warning(
                    f"Error during Elasticsearch search: {e}. Traceback: {traceback.format_exc()}"
                )
            # Fallback to database search on exception
            funds = MutualFund.objects.filter(Q(mf_name__icontains=query)).order_by(
                "-AUM"
            )

            page = self.paginate_queryset(funds)
            grouped = {}
            for fund in page:
                fund_type = fund.type
                serialized = MutualFundSerializer(fund).data
                # Map DB fields to ES fields
                mapped = {
                    "isin": serialized.get("isin_growth", serialized.get("isin", None)),
                    "mf_name": serialized.get("mf_name"),
                    "mf_schema_code": serialized.get("mf_schema_code"),
                    "start_date": serialized.get("start_date"),
                    "aum": float(serialized.get("AUM", serialized.get("aum", 0))),
                    "exit_load": serialized.get("exit_load"),
                    "expense_ratio": serialized.get("expense_ratio"),
                    "type": serialized.get("type"),
                    "latest_nav": float(serialized.get("latest_nav", 0)),
                    "latest_nav_date": serialized.get("latest_nav_date"),
                    "returns": None,
                }
                grouped.setdefault(fund_type, []).append(mapped)

            return self.get_paginated_response(grouped)
