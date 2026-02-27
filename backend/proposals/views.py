from django.db.models import Count, Subquery, OuterRef, DecimalField, F, Window
from django.db.models.functions import Rank
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .filters import NeighborhoodFilter, ProposalFilter
from django.db.models import Count, Q
from .models import (
    Borough,
    DemographicProfile,
    MarketData,
    Neighborhood,
    Proposal,
    ZoningDistrict,
)
from .permissions import IsProposalOwnerOrReadOnly
from .serializers import (
    BoroughSerializer,
    MarketDataSerializer,
    NeighborhoodDetailSerializer,
    NeighborhoodListSerializer,
    NeighborhoodMapDataSerializer,
    ProposalCreateUpdateSerializer,
    ProposalDetailSerializer,
    ProposalListSerializer,
)
from .tasks import calculate_feasibility_score, generate_financial_projections


class BoroughViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BoroughSerializer
    queryset = Borough.objects.annotate(
        neighborhood_count=Count("neighborhoods")
    )

    @method_decorator(cache_page(60 * 15))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class NeighborhoodViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = NeighborhoodFilter
    search_fields = ["name", "borough__name"]
    ordering_fields = ["name", "area_sq_miles"]

    def get_queryset(self):
        return Neighborhood.objects.select_related("borough").annotate(
            proposal_count=Count("proposals")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return NeighborhoodDetailSerializer
        return NeighborhoodListSerializer

    @method_decorator(cache_page(60 * 10))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def market_history(self, request, pk=None):
        """Full market data time series for a neighborhood."""
        neighborhood = self.get_object()
        qs = neighborhood.market_data.all()
        serializer = MarketDataSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="map-data")
    @method_decorator(cache_page(60 * 10))
    def map_data(self, request):
        """Enriched neighborhood data for the opportunity map (zoning, approval, demand, infra)."""
        neighborhoods = (
            Neighborhood.objects.select_related("borough")
            .prefetch_related(
                "zoning_districts",
                "market_data",
                "demographics",
            )
            .annotate(proposal_count=Count("proposals"))
        )
        approved_count = Count(
            "proposals", filter=Q(proposals__status=Proposal.Status.APPROVED)
        )
        rejected_count = Count(
            "proposals", filter=Q(proposals__status=Proposal.Status.REJECTED)
        )
        neighborhoods = neighborhoods.annotate(
            _approved=approved_count, _rejected=rejected_count
        )

        result = []
        for n in neighborhoods:
            zoning = list(n.zoning_districts.values_list("category", flat=True))
            zoning_has_residential = "residential" in zoning
            zoning_has_commercial = "commercial" in zoning
            zoning_has_mixed = "mixed" in zoning
            zoning_codes = list(n.zoning_districts.values_list("code", flat=True))

            total_decided = n._approved + n._rejected
            approval_rate_pct = (
                (float(n._approved) / total_decided * 100) if total_decided > 0 else None
            )

            # Latest market + demo for demand/infra
            latest_market = n.market_data.order_by("-period").first()
            latest_demo = n.demographics.order_by("-year").first()

            vacancy = float(latest_market.vacancy_rate_pct) if latest_market else 5.0
            rent = float(latest_market.median_rent) if latest_market else 2000
            growth = float(latest_demo.population_growth_pct) if latest_demo else 0
            transit = float(latest_demo.transit_score) if latest_demo else 50
            # Demand: low vacancy + high rent + growth + transit = high score
            demand_score = min(
                100,
                max(
                    0,
                    (100 - vacancy * 8)
                    + (min(rent / 100, 30))
                    + (growth * 5)
                    + (transit * 0.3),
                ),
            )

            result.append(
                {
                    "id": n.id,
                    "name": n.name,
                    "borough_name": n.borough.name,
                    "borough_code": n.borough.code,
                    "latitude": n.latitude,
                    "longitude": n.longitude,
                    "area_sq_miles": n.area_sq_miles,
                    "proposal_count": n.proposal_count,
                    "zoning_has_residential": zoning_has_residential,
                    "zoning_has_commercial": zoning_has_commercial,
                    "zoning_has_mixed": zoning_has_mixed,
                    "zoning_codes": zoning_codes[:5],
                    "approval_rate_pct": approval_rate_pct,
                    "demand_score": round(demand_score, 1),
                    "infrastructure_score": round(transit, 1) if latest_demo else None,
                    "median_sale_price": latest_market.median_sale_price if latest_market else None,
                    "median_rent": latest_market.median_rent if latest_market else None,
                    "vacancy_rate_pct": latest_market.vacancy_rate_pct if latest_market else None,
                }
            )

        serializer = NeighborhoodMapDataSerializer(result, many=True)
        return Response(serializer.data)


class ProposalViewSet(viewsets.ModelViewSet):
    filterset_class = ProposalFilter
    search_fields = ["title", "description"]
    ordering_fields = [
        "created_at", "updated_at", "feasibility_score",
        "total_units", "estimated_cost",
    ]

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsProposalOwnerOrReadOnly()]
        return [IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        qs = Proposal.objects.select_related(
            "neighborhood", "neighborhood__borough", "owner"
        )
        if self.action == "list":
            # Annotate with borough-level rank using Window function
            qs = qs.annotate(
                borough_rank=Window(
                    expression=Rank(),
                    partition_by=[F("neighborhood__borough")],
                    order_by=F("feasibility_score").desc(nulls_last=True),
                )
            )
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProposalDetailSerializer
        if self.action in ("create", "update", "partial_update"):
            return ProposalCreateUpdateSerializer
        return ProposalListSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsProposalOwnerOrReadOnly])
    def calculate_score(self, request, pk=None):
        """Trigger async feasibility score calculation via stored procedure."""
        proposal = self.get_object()
        calculate_feasibility_score.delay(proposal.id)
        return Response(
            {"detail": "Feasibility score calculation queued."},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsProposalOwnerOrReadOnly])
    def generate_projections(self, request, pk=None):
        """Trigger async financial projection generation via stored procedure."""
        proposal = self.get_object()
        if not proposal.estimated_cost:
            return Response(
                {"detail": "estimated_cost is required before generating projections."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not proposal.unit_mix.exists():
            return Response(
                {"detail": "Unit mix must be defined before generating projections."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        years = int(request.data.get("years", 10))
        generate_financial_projections.delay(proposal.id, years)
        return Response(
            {"detail": f"Financial projections ({years} years) generation queued."},
            status=status.HTTP_202_ACCEPTED,
        )
