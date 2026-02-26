from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import generics

from .models import MarketTrend, NeighborhoodRanking, ProposalDashboardSummary
from .serializers import (
    MarketTrendSerializer,
    NeighborhoodRankingSerializer,
    ProposalDashboardSummarySerializer,
)


class NeighborhoodRankingListView(generics.ListAPIView):
    serializer_class = NeighborhoodRankingSerializer
    queryset = NeighborhoodRanking.objects.all()

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class MarketTrendListView(generics.ListAPIView):
    serializer_class = MarketTrendSerializer

    def get_queryset(self):
        qs = MarketTrend.objects.all()
        neighborhood_id = self.request.query_params.get("neighborhood_id")
        if neighborhood_id:
            qs = qs.filter(neighborhood_id=neighborhood_id)
        return qs

    @method_decorator(cache_page(60 * 10))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class ProposalDashboardSummaryListView(generics.ListAPIView):
    serializer_class = ProposalDashboardSummarySerializer
    queryset = ProposalDashboardSummary.objects.all()

    @method_decorator(cache_page(60 * 5))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
