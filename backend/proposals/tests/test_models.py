from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from proposals.models import (
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


class BoroughModelTest(TestCase):
    def test_str(self):
        borough = Borough.objects.create(name="Manhattan", code="MN")
        self.assertEqual(str(borough), "Manhattan")

    def test_unique_code(self):
        Borough.objects.create(name="Manhattan", code="MN")
        with self.assertRaises(Exception):
            Borough.objects.create(name="Manhattan2", code="MN")


class NeighborhoodModelTest(TestCase):
    def setUp(self):
        self.borough = Borough.objects.create(name="Brooklyn", code="BK")

    def test_str(self):
        hood = Neighborhood.objects.create(
            borough=self.borough, name="Williamsburg",
            latitude=Decimal("40.708"), longitude=Decimal("-73.957"),
            area_sq_miles=Decimal("1.26"),
        )
        self.assertEqual(str(hood), "Williamsburg, BK")

    def test_unique_together(self):
        Neighborhood.objects.create(
            borough=self.borough, name="Williamsburg",
            latitude=Decimal("40.708"), longitude=Decimal("-73.957"),
            area_sq_miles=Decimal("1.26"),
        )
        with self.assertRaises(Exception):
            Neighborhood.objects.create(
                borough=self.borough, name="Williamsburg",
                latitude=Decimal("40.709"), longitude=Decimal("-73.958"),
                area_sq_miles=Decimal("1.30"),
            )


class ProposalModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass1234")
        self.borough = Borough.objects.create(name="Queens", code="QN")
        self.hood = Neighborhood.objects.create(
            borough=self.borough, name="Astoria",
            latitude=Decimal("40.772"), longitude=Decimal("-73.930"),
            area_sq_miles=Decimal("2.68"),
        )

    def test_default_status(self):
        proposal = Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Astoria Heights", lot_size_sqft=Decimal("50000"),
            total_units=120,
        )
        self.assertEqual(proposal.status, Proposal.Status.DRAFT)

    def test_str(self):
        proposal = Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Astoria Heights", lot_size_sqft=Decimal("50000"),
            total_units=120,
        )
        self.assertEqual(str(proposal), "Astoria Heights")


class ProposalUnitMixTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass1234")
        borough = Borough.objects.create(name="Manhattan", code="MN")
        hood = Neighborhood.objects.create(
            borough=borough, name="Harlem",
            latitude=Decimal("40.811"), longitude=Decimal("-73.946"),
            area_sq_miles=Decimal("2.09"),
        )
        self.proposal = Proposal.objects.create(
            owner=self.user, neighborhood=hood,
            title="Harlem Rise", lot_size_sqft=Decimal("30000"),
            total_units=80,
        )

    def test_unit_mix_creation(self):
        mix = ProposalUnitMix.objects.create(
            proposal=self.proposal, unit_type=ProposalUnitMix.UnitType.ONE_BR,
            count=40, avg_sqft=Decimal("650"), projected_rent=Decimal("2800"),
        )
        self.assertIn("1 Bedroom", str(mix))

    def test_unique_together(self):
        ProposalUnitMix.objects.create(
            proposal=self.proposal, unit_type=ProposalUnitMix.UnitType.STUDIO,
            count=20, avg_sqft=Decimal("450"), projected_rent=Decimal("2200"),
        )
        with self.assertRaises(Exception):
            ProposalUnitMix.objects.create(
                proposal=self.proposal, unit_type=ProposalUnitMix.UnitType.STUDIO,
                count=10, avg_sqft=Decimal("400"), projected_rent=Decimal("2000"),
            )
