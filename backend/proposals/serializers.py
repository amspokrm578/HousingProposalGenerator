from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Borough,
    DemographicProfile,
    FinancialProjection,
    MarketData,
    Neighborhood,
    Proposal,
    ProposalStatusHistory,
    ProposalUnitMix,
    ZoningDistrict,
)

User = get_user_model()


class BoroughSerializer(serializers.ModelSerializer):
    neighborhood_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Borough
        fields = ["id", "name", "code", "neighborhood_count"]


class ZoningDistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZoningDistrict
        fields = [
            "id", "code", "category", "max_far",
            "max_height_ft", "residential_allowed",
        ]


class MarketDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketData
        fields = [
            "id", "period", "median_sale_price", "median_rent",
            "vacancy_rate_pct", "permits_issued",
        ]


class DemographicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemographicProfile
        fields = [
            "id", "year", "population", "median_income",
            "population_growth_pct", "transit_score",
        ]


class NeighborhoodListSerializer(serializers.ModelSerializer):
    borough_name = serializers.CharField(source="borough.name", read_only=True)
    borough_code = serializers.CharField(source="borough.code", read_only=True)
    proposal_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Neighborhood
        fields = [
            "id", "name", "borough_name", "borough_code",
            "latitude", "longitude", "area_sq_miles", "proposal_count",
        ]


class NeighborhoodDetailSerializer(serializers.ModelSerializer):
    borough = BoroughSerializer(read_only=True)
    zoning_districts = ZoningDistrictSerializer(many=True, read_only=True)
    latest_market_data = serializers.SerializerMethodField()
    latest_demographics = serializers.SerializerMethodField()

    class Meta:
        model = Neighborhood
        fields = [
            "id", "name", "borough", "latitude", "longitude",
            "area_sq_miles", "zoning_districts",
            "latest_market_data", "latest_demographics",
        ]

    def get_latest_market_data(self, obj):
        qs = obj.market_data.order_by("-period")[:4]
        return MarketDataSerializer(qs, many=True).data

    def get_latest_demographics(self, obj):
        qs = obj.demographics.order_by("-year")[:3]
        return DemographicProfileSerializer(qs, many=True).data


class ProposalUnitMixSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposalUnitMix
        fields = ["id", "unit_type", "count", "avg_sqft", "projected_rent"]


class FinancialProjectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialProjection
        fields = ["id", "year", "revenue", "expenses", "net_income", "cumulative_roi"]


class ProposalStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposalStatusHistory
        fields = ["id", "old_status", "new_status", "changed_at", "changed_by"]


class ProposalListSerializer(serializers.ModelSerializer):
    neighborhood_name = serializers.CharField(
        source="neighborhood.name", read_only=True
    )
    borough_name = serializers.CharField(
        source="neighborhood.borough.name", read_only=True
    )
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Proposal
        fields = [
            "id", "title", "status", "neighborhood_name", "borough_name",
            "owner_username", "total_units", "lot_size_sqft",
            "estimated_cost", "projected_revenue", "feasibility_score",
            "created_at", "updated_at",
        ]


class ProposalCreateUpdateSerializer(serializers.ModelSerializer):
    """Nested writable serializer: create/update proposal with unit mix in one request."""

    unit_mix = ProposalUnitMixSerializer(many=True)

    class Meta:
        model = Proposal
        fields = [
            "id", "title", "description", "neighborhood", "status",
            "lot_size_sqft", "total_units", "unit_mix",
        ]
        read_only_fields = ["id"]

    def validate_unit_mix(self, value):
        if not value:
            raise serializers.ValidationError("At least one unit type is required.")
        total = sum(item["count"] for item in value)
        return value

    def validate(self, data):
        unit_mix = data.get("unit_mix", [])
        if unit_mix:
            unit_total = sum(item["count"] for item in unit_mix)
            if data.get("total_units") and unit_total != data["total_units"]:
                raise serializers.ValidationError({
                    "total_units": f"total_units ({data['total_units']}) must match "
                                   f"sum of unit_mix counts ({unit_total})."
                })
        return data

    def create(self, validated_data):
        unit_mix_data = validated_data.pop("unit_mix")
        validated_data["owner"] = self.context["request"].user
        proposal = Proposal.objects.create(**validated_data)
        for unit_data in unit_mix_data:
            ProposalUnitMix.objects.create(proposal=proposal, **unit_data)
        return proposal

    def update(self, instance, validated_data):
        unit_mix_data = validated_data.pop("unit_mix", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if unit_mix_data is not None:
            instance.unit_mix.all().delete()
            for unit_data in unit_mix_data:
                ProposalUnitMix.objects.create(proposal=instance, **unit_data)
        return instance


class ProposalDetailSerializer(serializers.ModelSerializer):
    neighborhood = NeighborhoodListSerializer(read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    unit_mix = ProposalUnitMixSerializer(many=True, read_only=True)
    financial_projections = FinancialProjectionSerializer(many=True, read_only=True)
    status_history = ProposalStatusHistorySerializer(
        many=True, read_only=True, source="status_history"
    )

    class Meta:
        model = Proposal
        fields = [
            "id", "title", "description", "status", "neighborhood",
            "owner_username", "lot_size_sqft", "total_units",
            "estimated_cost", "projected_revenue", "feasibility_score",
            "created_at", "updated_at",
            "unit_mix", "financial_projections", "status_history",
        ]
