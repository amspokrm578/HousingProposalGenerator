from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from proposals.models import Borough, Neighborhood, Proposal, ProposalUnitMix

User = get_user_model()


class BoroughViewSetTest(APITestCase):
    def setUp(self):
        Borough.objects.create(name="Manhattan", code="MN")
        Borough.objects.create(name="Brooklyn", code="BK")

    def test_list_boroughs(self):
        response = self.client.get("/api/boroughs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)


class NeighborhoodViewSetTest(APITestCase):
    def setUp(self):
        self.borough = Borough.objects.create(name="Brooklyn", code="BK")
        self.hood1 = Neighborhood.objects.create(
            borough=self.borough, name="Williamsburg",
            latitude=Decimal("40.708"), longitude=Decimal("-73.957"),
            area_sq_miles=Decimal("1.26"),
        )
        self.hood2 = Neighborhood.objects.create(
            borough=self.borough, name="Park Slope",
            latitude=Decimal("40.671"), longitude=Decimal("-73.977"),
            area_sq_miles=Decimal("0.63"),
        )

    def test_list_neighborhoods(self):
        response = self.client.get("/api/neighborhoods/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_filter_by_borough(self):
        Borough.objects.create(name="Queens", code="QN")
        response = self.client.get("/api/neighborhoods/", {"borough": "BK"})
        self.assertEqual(len(response.data["results"]), 2)

    def test_search(self):
        response = self.client.get("/api/neighborhoods/", {"search": "Slope"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Park Slope")

    def test_retrieve_detail(self):
        response = self.client.get(f"/api/neighborhoods/{self.hood1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("zoning_districts", response.data)


class ProposalViewSetTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass1234")
        self.other_user = User.objects.create_user(username="other", password="pass1234")
        self.token = Token.objects.create(user=self.user)
        self.other_token = Token.objects.create(user=self.other_user)
        borough = Borough.objects.create(name="Manhattan", code="MN")
        self.hood = Neighborhood.objects.create(
            borough=borough, name="Harlem",
            latitude=Decimal("40.811"), longitude=Decimal("-73.946"),
            area_sq_miles=Decimal("2.09"),
        )

    def _auth(self, token=None):
        t = token or self.token
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {t.key}")

    def test_create_proposal(self):
        self._auth()
        data = {
            "title": "Harlem Heights",
            "neighborhood": self.hood.id,
            "lot_size_sqft": "35000.00",
            "total_units": 80,
            "unit_mix": [
                {"unit_type": "studio", "count": 30, "avg_sqft": "450.00", "projected_rent": "2200.00"},
                {"unit_type": "1br", "count": 50, "avg_sqft": "650.00", "projected_rent": "2800.00"},
            ],
        }
        response = self.client.post("/api/proposals/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Proposal.objects.count(), 1)
        self.assertEqual(ProposalUnitMix.objects.count(), 2)

    def test_unauthenticated_create_forbidden(self):
        data = {
            "title": "No Auth",
            "neighborhood": self.hood.id,
            "lot_size_sqft": "10000.00",
            "total_units": 20,
            "unit_mix": [
                {"unit_type": "studio", "count": 20, "avg_sqft": "450.00", "projected_rent": "2200.00"},
            ],
        }
        response = self.client.post("/api/proposals/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_proposals(self):
        Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Test Prop", lot_size_sqft=Decimal("10000"),
            total_units=20,
        )
        response = self.client.get("/api/proposals/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_owner_can_update(self):
        self._auth()
        proposal = Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Old Title", lot_size_sqft=Decimal("10000"),
            total_units=20,
        )
        response = self.client.patch(
            f"/api/proposals/{proposal.id}/",
            {"title": "New Title", "unit_mix": [
                {"unit_type": "studio", "count": 20, "avg_sqft": "400.00", "projected_rent": "2000.00"},
            ]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_owner_cannot_update(self):
        proposal = Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Mine", lot_size_sqft=Decimal("10000"),
            total_units=20,
        )
        self._auth(self.other_token)
        response = self.client.patch(
            f"/api/proposals/{proposal.id}/",
            {"title": "Stolen", "unit_mix": []},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_filter_by_status(self):
        Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Draft One", lot_size_sqft=Decimal("10000"),
            total_units=20, status=Proposal.Status.DRAFT,
        )
        Proposal.objects.create(
            owner=self.user, neighborhood=self.hood,
            title="Submitted One", lot_size_sqft=Decimal("15000"),
            total_units=30, status=Proposal.Status.SUBMITTED,
        )
        response = self.client.get("/api/proposals/", {"status": "draft"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Draft One")
