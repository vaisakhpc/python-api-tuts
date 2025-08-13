from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from elasticsearch import Elasticsearch
from api.config.es_config import NAV_INDEX_NAME
import datetime
from django.conf import settings

class FundPriceView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        isin = request.query_params.get('isin')
        date_str = request.query_params.get('date')
        if not isin or not date_str:
            return Response({'error': 'isin and date are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            datetime.datetime.strptime(date_str, "%Y-%m-%d")
        except Exception:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        es_host = getattr(settings, "ELASTICSEARCH_HOST", "http://localhost:9200")
        es = Elasticsearch(es_host)
        result = es.search(index=NAV_INDEX_NAME, body={
            "query": {
                "bool": {
                    "must": [
                        {"term": {"isin": isin}},
                        {
                            "nested": {
                                "path": "history",
                                "query": {
                                    "bool": {
                                        "must": [
                                            {"term": {"history.date": date_str}}
                                        ]
                                    }
                                },
                                "inner_hits": {}
                            }
                        }
                    ]
                }
            },
            "size": 1
        })
        hits = result.get('hits', {}).get('hits', [])
        if not hits:
            return Response({'error': 'ISIN or date not found'}, status=status.HTTP_404_NOT_FOUND)
        doc = hits[0]
        inner_hits = doc.get('inner_hits', {}).get('history', {}).get('hits', {}).get('hits', [])
        if not inner_hits:
            return Response({'error': 'Price not found for given date'}, status=status.HTTP_404_NOT_FOUND)
        nav = inner_hits[0]['_source'].get('nav')
        return Response({
            'isin': isin,
            'date': date_str,
            'price': nav
        }, status=status.HTTP_200_OK)
