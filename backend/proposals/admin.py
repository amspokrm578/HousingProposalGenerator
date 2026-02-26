from django.contrib import admin

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


@admin.register(Borough)
class BoroughAdmin(admin.ModelAdmin):
    list_display = ["name", "code"]


class ZoningDistrictInline(admin.TabularInline):
    model = ZoningDistrict
    extra = 0


@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ["name", "borough", "area_sq_miles"]
    list_filter = ["borough"]
    search_fields = ["name"]
    inlines = [ZoningDistrictInline]


@admin.register(MarketData)
class MarketDataAdmin(admin.ModelAdmin):
    list_display = ["neighborhood", "period", "median_sale_price", "median_rent"]
    list_filter = ["neighborhood__borough", "period"]


@admin.register(DemographicProfile)
class DemographicProfileAdmin(admin.ModelAdmin):
    list_display = ["neighborhood", "year", "population", "median_income"]
    list_filter = ["year", "neighborhood__borough"]


class ProposalUnitMixInline(admin.TabularInline):
    model = ProposalUnitMix
    extra = 0


class FinancialProjectionInline(admin.TabularInline):
    model = FinancialProjection
    extra = 0


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "neighborhood", "total_units", "feasibility_score", "updated_at"]
    list_filter = ["status", "neighborhood__borough"]
    search_fields = ["title"]
    readonly_fields = ["created_at", "updated_at", "feasibility_score"]
    inlines = [ProposalUnitMixInline, FinancialProjectionInline]


@admin.register(ProposalStatusHistory)
class ProposalStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ["proposal", "old_status", "new_status", "changed_at", "changed_by"]
    list_filter = ["new_status"]
