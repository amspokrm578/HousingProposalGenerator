from django.conf import settings
from django.db import models


class Borough(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=5, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Neighborhood(models.Model):
    borough = models.ForeignKey(
        Borough, on_delete=models.CASCADE, related_name="neighborhoods"
    )
    name = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    area_sq_miles = models.DecimalField(max_digits=7, decimal_places=3)

    class Meta:
        ordering = ["borough", "name"]
        unique_together = ["borough", "name"]

    def __str__(self):
        return f"{self.name}, {self.borough.code}"


class ZoningDistrict(models.Model):
    CATEGORY_CHOICES = [
        ("residential", "Residential"),
        ("commercial", "Commercial"),
        ("manufacturing", "Manufacturing"),
        ("mixed", "Mixed Use"),
    ]

    neighborhood = models.ForeignKey(
        Neighborhood, on_delete=models.CASCADE, related_name="zoning_districts"
    )
    code = models.CharField(max_length=10)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    max_far = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="Maximum Floor Area Ratio"
    )
    max_height_ft = models.IntegerField()
    residential_allowed = models.BooleanField(default=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} ({self.neighborhood})"


class MarketData(models.Model):
    neighborhood = models.ForeignKey(
        Neighborhood, on_delete=models.CASCADE, related_name="market_data"
    )
    period = models.DateField()
    median_sale_price = models.DecimalField(max_digits=14, decimal_places=2)
    median_rent = models.DecimalField(max_digits=10, decimal_places=2)
    vacancy_rate_pct = models.DecimalField(max_digits=5, decimal_places=2)
    permits_issued = models.IntegerField()

    class Meta:
        ordering = ["-period"]
        unique_together = ["neighborhood", "period"]

    def __str__(self):
        return f"{self.neighborhood} - {self.period}"


class DemographicProfile(models.Model):
    neighborhood = models.ForeignKey(
        Neighborhood, on_delete=models.CASCADE, related_name="demographics"
    )
    year = models.IntegerField()
    population = models.IntegerField()
    median_income = models.DecimalField(max_digits=12, decimal_places=2)
    population_growth_pct = models.DecimalField(max_digits=5, decimal_places=2)
    transit_score = models.DecimalField(
        max_digits=4, decimal_places=1, help_text="0-100 transit accessibility score"
    )

    class Meta:
        ordering = ["-year"]
        unique_together = ["neighborhood", "year"]

    def __str__(self):
        return f"{self.neighborhood} ({self.year})"


class Proposal(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="proposals"
    )
    neighborhood = models.ForeignKey(
        Neighborhood, on_delete=models.PROTECT, related_name="proposals"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    lot_size_sqft = models.DecimalField(max_digits=12, decimal_places=2)
    total_units = models.IntegerField()
    estimated_cost = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    projected_revenue = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    feasibility_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="0-100 computed feasibility score"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class ProposalUnitMix(models.Model):
    class UnitType(models.TextChoices):
        STUDIO = "studio", "Studio"
        ONE_BR = "1br", "1 Bedroom"
        TWO_BR = "2br", "2 Bedroom"
        THREE_BR = "3br", "3 Bedroom"
        FOUR_BR = "4br", "4+ Bedroom"

    proposal = models.ForeignKey(
        Proposal, on_delete=models.CASCADE, related_name="unit_mix"
    )
    unit_type = models.CharField(max_length=10, choices=UnitType.choices)
    count = models.IntegerField()
    avg_sqft = models.DecimalField(max_digits=8, decimal_places=2)
    projected_rent = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ["proposal", "unit_type"]

    def __str__(self):
        return f"{self.proposal.title} - {self.get_unit_type_display()} x{self.count}"


class FinancialProjection(models.Model):
    proposal = models.ForeignKey(
        Proposal, on_delete=models.CASCADE, related_name="financial_projections"
    )
    year = models.IntegerField()
    revenue = models.DecimalField(max_digits=14, decimal_places=2)
    expenses = models.DecimalField(max_digits=14, decimal_places=2)
    net_income = models.DecimalField(max_digits=14, decimal_places=2)
    cumulative_roi = models.DecimalField(max_digits=7, decimal_places=2)

    class Meta:
        ordering = ["year"]
        unique_together = ["proposal", "year"]

    def __str__(self):
        return f"{self.proposal.title} - Year {self.year}"


class ProposalStatusHistory(models.Model):
    proposal = models.ForeignKey(
        Proposal, on_delete=models.CASCADE, related_name="status_history"
    )
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ["-changed_at"]
        verbose_name_plural = "Proposal status histories"

    def __str__(self):
        return f"{self.proposal.title}: {self.old_status} -> {self.new_status}"
