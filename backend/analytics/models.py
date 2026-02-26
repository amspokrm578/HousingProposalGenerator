from django.db import models


class NeighborhoodRanking(models.Model):
    """Unmanaged model mapped to vw_NeighborhoodRankings T-SQL view."""

    neighborhood_id = models.IntegerField(primary_key=True)
    neighborhood_name = models.CharField(max_length=100)
    borough_name = models.CharField(max_length=50)
    median_sale_price = models.DecimalField(max_digits=14, decimal_places=2)
    median_rent = models.DecimalField(max_digits=10, decimal_places=2)
    vacancy_rate_pct = models.DecimalField(max_digits=5, decimal_places=2)
    population = models.IntegerField()
    median_income = models.DecimalField(max_digits=12, decimal_places=2)
    transit_score = models.DecimalField(max_digits=4, decimal_places=1)
    development_score = models.DecimalField(max_digits=7, decimal_places=2)
    overall_rank = models.IntegerField()
    quartile = models.IntegerField()

    class Meta:
        managed = False
        db_table = "vw_NeighborhoodRankings"


class MarketTrend(models.Model):
    """Unmanaged model mapped to vw_MarketTrends T-SQL view."""

    id = models.IntegerField(primary_key=True)
    neighborhood_id = models.IntegerField()
    neighborhood_name = models.CharField(max_length=100)
    period = models.DateField()
    median_sale_price = models.DecimalField(max_digits=14, decimal_places=2)
    median_rent = models.DecimalField(max_digits=10, decimal_places=2)
    price_change_pct = models.DecimalField(max_digits=7, decimal_places=2, null=True)
    rent_change_pct = models.DecimalField(max_digits=7, decimal_places=2, null=True)

    class Meta:
        managed = False
        db_table = "vw_MarketTrends"


class ProposalDashboardSummary(models.Model):
    """Unmanaged model mapped to vw_ProposalDashboardSummary T-SQL view."""

    borough_name = models.CharField(max_length=50, primary_key=True)
    total_proposals = models.IntegerField()
    total_units = models.IntegerField()
    avg_feasibility_score = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    total_estimated_cost = models.DecimalField(max_digits=16, decimal_places=2)
    total_projected_revenue = models.DecimalField(max_digits=16, decimal_places=2)

    class Meta:
        managed = False
        db_table = "vw_ProposalDashboardSummary"
