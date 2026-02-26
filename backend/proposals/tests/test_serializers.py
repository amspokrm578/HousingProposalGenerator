from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from proposals.models import Borough, Neighborhood, Proposal, ProposalUnitMix
from proposals.serializers import (
    ProposalCreateUpdateSerializer,
    ProposalListSerializer,
)

User = get_user_model()


class ProposalCreateUpdateSerializerTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(username="tester", password="pass1234")
        self.borough = Borough.objects.create(name="Brooklyn", code="BK")
        self.hood = Neighborhood.objects.create(
            borough=self.borough, name="Williamsburg",
            latitude=Decimal("40.708"), longitude=Decimal("-73.957"),
            area_sq_miles=Decimal("1.26"),
        )

    def _request(self):
        req = self.factory.post("/")
        req.user = self.user
        return req

    def test_valid_create(self):
        data = {
            "title": "WB Lofts",
            "neighborhood": self.hood.id,
            "lot_size_sqft": "25000.00",
            "total_units": 60,
            "unit_mix": [
                {"unit_type": "studio", "count": 20, "avg_sqft": "450.00", "projected_rent": "2400.00"},
                {"unit_type": "1br", "count": 25, "avg_sqft": "650.00", "projected_rent": "3000.00"},
                {"unit_type": "2br", "count": 15, "avg_sqft": "900.00", "projected_rent": "3800.00"},
            ],
        }
        serializer = ProposalCreateUpdateSerializer(data=data, context={"request": self._request()})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        proposal = serializer.save()
        self.assertEqual(proposal.owner, self.user)
        self.assertEqual(proposal.unit_mix.count(), 3)

    def test_unit_count_mismatch(self):
        data = {
            "title": "Bad Mix",
            "neighborhood": self.hood.id,
            "lot_size_sqft": "25000.00",
            "total_units": 100,
            "unit_mix": [
                {"unit_type": "studio", "count": 20, "avg_sqft": "450.00", "projected_rent": "2400.00"},
            ],
        }
        serializer = ProposalCreateUpdateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())
        self.assertIn("total_units", serializer.errors)

    def test_empty_unit_mix(self):
        data = {
            "title": "No Units",
            "neighborhood": self.hood.id,
            "lot_size_sqft": "25000.00",
            "total_units": 0,
            "unit_mix": [],
        }
        serializer = ProposalCreateUpdateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())


class ProposalListSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass1234")
        borough = Borough.objects.create(name="Queens", code="QN")
        self.hood = Neighborhood.objects.create(
            borough=borough, name="LIC",
            latitude=Decimal("40.742"), longitude=Decimal("-73.958"),
            area_sq_miles=Decimal("1.53"),
        )

    def test_serializer_fields(self):
        proposal = Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="LIC Tower", lot_size_sqft=Decimal("40000"),
            total_units=200,
        )
        serializer = ProposalListSerializer(proposal)
        data = serializer.data
        self.assertEqual(data["title"], "LIC Tower")
        self.assertEqual(data["neighborhood_name"], "LIC")
        self.assertEqual(data["borough_name"], "Queens")
        self.assertEqual(data["owner_username"], "tester")
