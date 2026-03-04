from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional

from django.core.cache import cache

from .models import DemographicProfile, MarketData, Neighborhood, ZoningDistrict


@dataclass
class ZoningSnapshot:
    codes: list[str]
    has_residential: bool
    has_commercial: bool
    has_mixed: bool
    max_far: Optional[float]
    max_height_ft: Optional[int]


@dataclass
class MarketSnapshot:
    period: Optional[str]
    median_sale_price: Optional[float]
    median_rent: Optional[float]
    vacancy_rate_pct: Optional[float]
    permits_issued: Optional[int]


@dataclass
class DemographicSnapshot:
    year: Optional[int]
    population: Optional[int]
    median_income: Optional[float]
    population_growth_pct: Optional[float]
    transit_score: Optional[float]


@dataclass
class NeighborhoodSiteContext:
    neighborhood_id: int
    neighborhood_name: str
    borough_name: str
    borough_code: str
    zoning: ZoningSnapshot
    market: MarketSnapshot
    demographics: DemographicSnapshot


def _build_zoning_snapshot(neighborhood: Neighborhood) -> ZoningSnapshot:
    zones = list(
        ZoningDistrict.objects.filter(neighborhood=neighborhood).values(
            "code", "category", "max_far", "max_height_ft"
        )
    )
    codes = [z["code"] for z in zones]
    has_residential = any(z["category"] == "residential" for z in zones)
    has_commercial = any(z["category"] == "commercial" for z in zones)
    has_mixed = any(z["category"] == "mixed" for z in zones)

    max_far = max((float(z["max_far"]) for z in zones), default=None)
    max_height_ft = max((int(z["max_height_ft"]) for z in zones), default=None)

    return ZoningSnapshot(
        codes=codes[:5],
        has_residential=has_residential,
        has_commercial=has_commercial,
        has_mixed=has_mixed,
        max_far=max_far,
        max_height_ft=max_height_ft,
    )


def _build_market_snapshot(neighborhood: Neighborhood) -> MarketSnapshot:
    latest: Optional[MarketData] = (
        MarketData.objects.filter(neighborhood=neighborhood).order_by("-period").first()
    )
    if not latest:
        return MarketSnapshot(
            period=None,
            median_sale_price=None,
            median_rent=None,
            vacancy_rate_pct=None,
            permits_issued=None,
        )

    return MarketSnapshot(
        period=str(latest.period),
        median_sale_price=float(latest.median_sale_price),
        median_rent=float(latest.median_rent),
        vacancy_rate_pct=float(latest.vacancy_rate_pct),
        permits_issued=int(latest.permits_issued),
    )


def _build_demographic_snapshot(neighborhood: Neighborhood) -> DemographicSnapshot:
    latest: Optional[DemographicProfile] = (
        DemographicProfile.objects.filter(neighborhood=neighborhood)
        .order_by("-year")
        .first()
    )
    if not latest:
        return DemographicSnapshot(
            year=None,
            population=None,
            median_income=None,
            population_growth_pct=None,
            transit_score=None,
        )

    return DemographicSnapshot(
        year=latest.year,
        population=latest.population,
        median_income=float(latest.median_income),
        population_growth_pct=float(latest.population_growth_pct),
        transit_score=float(latest.transit_score),
    )


def get_neighborhood_site_context(neighborhood: Neighborhood) -> Dict[str, Any]:
    """
    Aggregate NYC open-data-style signals for a neighborhood.

    For the MVP this is built from our local seed data (zoning, market,
    demographics) and cached, but the function is intentionally shaped so we
    can later swap in real NYC Open Data ingestion without changing callers.
    """

    cache_key = f"nyc_site_ctx:{neighborhood.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    zoning = _build_zoning_snapshot(neighborhood)
    market = _build_market_snapshot(neighborhood)
    demo = _build_demographic_snapshot(neighborhood)

    ctx = NeighborhoodSiteContext(
        neighborhood_id=neighborhood.id,
        neighborhood_name=neighborhood.name,
        borough_name=neighborhood.borough.name,
        borough_code=neighborhood.borough.code,
        zoning=zoning,
        market=market,
        demographics=demo,
    )

    payload: Dict[str, Any] = {
        "neighborhood_id": ctx.neighborhood_id,
        "neighborhood_name": ctx.neighborhood_name,
        "borough_name": ctx.borough_name,
        "borough_code": ctx.borough_code,
        "zoning": asdict(ctx.zoning),
        "market": asdict(ctx.market),
        "demographics": asdict(ctx.demographics),
    }

    # Cache for 10 minutes – this data is slow-changing.
    cache.set(cache_key, payload, timeout=60 * 10)
    return payload

