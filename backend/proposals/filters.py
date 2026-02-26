import django_filters

from .models import Neighborhood, Proposal


class NeighborhoodFilter(django_filters.FilterSet):
    borough = django_filters.CharFilter(field_name="borough__code", lookup_expr="iexact")
    min_area = django_filters.NumberFilter(field_name="area_sq_miles", lookup_expr="gte")
    max_area = django_filters.NumberFilter(field_name="area_sq_miles", lookup_expr="lte")

    class Meta:
        model = Neighborhood
        fields = ["borough", "min_area", "max_area"]


class ProposalFilter(django_filters.FilterSet):
    borough = django_filters.CharFilter(
        field_name="neighborhood__borough__code", lookup_expr="iexact"
    )
    status = django_filters.ChoiceFilter(choices=Proposal.Status.choices)
    min_units = django_filters.NumberFilter(field_name="total_units", lookup_expr="gte")
    max_units = django_filters.NumberFilter(field_name="total_units", lookup_expr="lte")
    min_score = django_filters.NumberFilter(field_name="feasibility_score", lookup_expr="gte")
    owner = django_filters.CharFilter(field_name="owner__username")

    class Meta:
        model = Proposal
        fields = ["borough", "status", "min_units", "max_units", "min_score", "owner"]
