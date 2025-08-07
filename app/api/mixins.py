# api/mixins.py
from rest_framework.pagination import PageNumberPagination
from urllib.parse import urlencode, urlparse, parse_qs, urlunparse


class PaginationMixin:
    pagination_class = PageNumberPagination

    @property
    def paginator(self):
        if not hasattr(self, "_paginator"):
            if self.pagination_class is None:
                self._paginator = None
            else:
                self._paginator = self.pagination_class()
        return self._paginator

    def paginate_queryset(self, queryset):
        if self.paginator is None:
            return None
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        assert self.paginator is not None
        return self.paginator.get_paginated_response(data)

    def get_es_pagination_params(self, request):
        """
        Get pagination parameters for Elasticsearch queries.
        """
        paginator = self.pagination_class()
        page_size = paginator.get_page_size(request)
        page_number = int(paginator.get_page_number(request, 1))

        # Calculate `from` and `size` for Elasticsearch
        from_ = (page_number - 1) * page_size
        size = page_size

        return from_, size

    def paginate_es_results(self, es_response, request):
        """
        Paginate Elasticsearch results.
        """
        if self.paginator is None:
            return None

        # Get pagination parameters
        page_size = self.paginator.get_page_size(request)
        page_number = int(request.query_params.get(self.paginator.page_query_param, 1))

        # Extract _source from hits
        hits = es_response["hits"]["hits"]
        results = [hit["_source"] for hit in hits]

        # Set pagination metadata
        total = es_response["hits"]["total"]["value"]
        current_count = len(results)  # Count of the current result set
        next_link = self._get_next_link(request, page_number, page_size, total)
        previous_link = self._get_previous_link(request, page_number, page_size)

        return {
            "results": results,
            "count": total,
            "current_count": current_count,
            "next": next_link,
            "previous": previous_link,
        }

    def _get_next_link(self, request, start, size, total):
        """
        Generate the next link for Elasticsearch pagination.
        """
        if (start + size) >= total:
            return None
        url = request.build_absolute_uri()
        next_page = (start // size) + 2
        return self._replace_query_param(
            url, self.paginator.page_query_param, next_page
        )

    def _get_previous_link(self, request, start, size):
        """
        Generate the previous link for Elasticsearch pagination.
        """
        if start <= 0:
            return None
        url = request.build_absolute_uri()
        previous_page = start // size
        return self._replace_query_param(
            url, self.paginator.page_query_param, previous_page
        )

    def _replace_query_param(self, url, key, val):
        """
        Replace a query parameter in the URL.
        """
        scheme, netloc, path, params, query, fragment = urlparse(url)
        query_dict = parse_qs(query, keep_blank_values=True)
        query_dict[key] = [val]
        query = urlencode(query_dict, doseq=True)
        return urlunparse((scheme, netloc, path, params, query, fragment))
