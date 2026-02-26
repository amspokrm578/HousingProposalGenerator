from rest_framework import serializers

from .models import MarketTrend, NeighborhoodRanking, ProposalDashboardSummary


class NeighborhoodRankingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NeighborhoodRanking
        fields = [
            "neighborhood_id", "neighborhood_name", "borough_name",
            "median_sale_price", "median_rent", "vacancy_rate_pct",
            "population", "median_income", "transit_score",
            "development_score", "overall_rank", "quartile",
        ]


class MarketTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketTrend
        fields = [
            "id", "neighborhood_id", "neighborhood_name", "period",
            "median_sale_price", "median_rent",
            "price_change_pct", "rent_change_pct",
        ]


class ProposalDashboardSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposalDashboardSummary
        fields = [
            "borough_name", "total_proposals", "total_units",
            "avg_feasibility_score", "total_estimated_cost",
            "total_projected_revenue",
        ]
