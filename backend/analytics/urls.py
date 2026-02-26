from django.urls import path

from .views import (
    MarketTrendListView,
    NeighborhoodRankingListView,
    ProposalDashboardSummaryListView,
)

urlpatterns = [
    path("rankings/", NeighborhoodRankingListView.as_view(), name="neighborhood-rankings"),
    path("market-trends/", MarketTrendListView.as_view(), name="market-trends"),
    path("dashboard/", ProposalDashboardSummaryListView.as_view(), name="dashboard-summary"),
]
