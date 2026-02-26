import random
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from proposals.models import (
    Borough,
    DemographicProfile,
    MarketData,
    Neighborhood,
    ZoningDistrict,
)

User = get_user_model()

BOROUGHS = [
    ("Manhattan", "MN"),
    ("Brooklyn", "BK"),
    ("Queens", "QN"),
    ("Bronx", "BX"),
    ("Staten Island", "SI"),
]

NEIGHBORHOODS = {
    "MN": [
        ("Harlem", 40.8116, -73.9465, 2.09),
        ("East Village", 40.7265, -73.9815, 0.34),
        ("Upper West Side", 40.7870, -73.9754, 1.07),
        ("Lower East Side", 40.7150, -73.9843, 0.39),
        ("Washington Heights", 40.8417, -73.9393, 1.06),
        ("Inwood", 40.8677, -73.9212, 0.82),
        ("Chelsea", 40.7465, -74.0014, 0.47),
        ("Midtown", 40.7549, -73.9840, 0.69),
    ],
    "BK": [
        ("Williamsburg", 40.7081, -73.9571, 1.26),
        ("Bedford-Stuyvesant", 40.6872, -73.9418, 2.82),
        ("Crown Heights", 40.6694, -73.9422, 1.78),
        ("Bushwick", 40.6942, -73.9214, 1.39),
        ("Park Slope", 40.6710, -73.9777, 0.63),
        ("East New York", 40.6590, -73.8759, 3.11),
        ("Flatbush", 40.6523, -73.9618, 1.41),
        ("Greenpoint", 40.7274, -73.9514, 0.94),
    ],
    "QN": [
        ("Long Island City", 40.7425, -73.9584, 1.53),
        ("Astoria", 40.7720, -73.9301, 2.68),
        ("Flushing", 40.7654, -73.8318, 2.44),
        ("Jamaica", 40.7028, -73.7890, 3.87),
        ("Jackson Heights", 40.7557, -73.8831, 1.09),
        ("Sunnyside", 40.7433, -73.9196, 0.71),
        ("Ridgewood", 40.7043, -73.9050, 1.14),
    ],
    "BX": [
        ("South Bronx", 40.8176, -73.9209, 3.14),
        ("Fordham", 40.8614, -73.8908, 1.27),
        ("Riverdale", 40.9005, -73.9094, 3.92),
        ("Parkchester", 40.8383, -73.8603, 0.98),
        ("Hunts Point", 40.8094, -73.8803, 1.48),
        ("Mott Haven", 40.8089, -73.9230, 0.89),
    ],
    "SI": [
        ("St. George", 40.6433, -74.0764, 0.89),
        ("Stapleton", 40.6265, -74.0765, 0.94),
        ("Tottenville", 40.5076, -74.2380, 3.36),
        ("New Dorp", 40.5734, -74.1172, 1.82),
    ],
}

ZONING_CONFIGS = {
    "MN": [
        ("R8A", "residential", 6.02, 120, True),
        ("R10", "residential", 10.00, 210, True),
        ("C6-4", "mixed", 10.00, 185, True),
    ],
    "BK": [
        ("R6A", "residential", 3.00, 70, True),
        ("R7A", "residential", 4.00, 80, True),
        ("M1-4", "mixed", 2.00, 60, True),
    ],
    "QN": [
        ("R5", "residential", 1.25, 40, True),
        ("R6B", "residential", 2.00, 55, True),
        ("C4-3", "mixed", 3.40, 75, True),
    ],
    "BX": [
        ("R6", "residential", 2.43, 70, True),
        ("R7-1", "residential", 3.44, 85, True),
        ("M1-2", "manufacturing", 2.00, 60, False),
    ],
    "SI": [
        ("R3-2", "residential", 0.50, 35, True),
        ("R4", "residential", 0.75, 35, True),
        ("C4-1", "commercial", 1.00, 35, False),
    ],
}


class Command(BaseCommand):
    help = "Seed database with realistic NYC neighborhood, zoning, market, and demographic data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true", help="Clear existing data before seeding"
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data...")
            MarketData.objects.all().delete()
            DemographicProfile.objects.all().delete()
            ZoningDistrict.objects.all().delete()
            Neighborhood.objects.all().delete()
            Borough.objects.all().delete()

        self._seed_boroughs()
        self._seed_neighborhoods()
        self._seed_zoning()
        self._seed_market_data()
        self._seed_demographics()
        self._create_demo_user()

        self.stdout.write(self.style.SUCCESS("NYC data seeded successfully."))

    def _seed_boroughs(self):
        for name, code in BOROUGHS:
            Borough.objects.get_or_create(name=name, code=code)
        self.stdout.write(f"  Boroughs: {Borough.objects.count()}")

    def _seed_neighborhoods(self):
        for borough_code, hoods in NEIGHBORHOODS.items():
            borough = Borough.objects.get(code=borough_code)
            for name, lat, lng, area in hoods:
                Neighborhood.objects.get_or_create(
                    borough=borough,
                    name=name,
                    defaults={
                        "latitude": Decimal(str(lat)),
                        "longitude": Decimal(str(lng)),
                        "area_sq_miles": Decimal(str(area)),
                    },
                )
        self.stdout.write(f"  Neighborhoods: {Neighborhood.objects.count()}")

    def _seed_zoning(self):
        for borough_code, zones in ZONING_CONFIGS.items():
            borough = Borough.objects.get(code=borough_code)
            for hood in borough.neighborhoods.all():
                for code, category, far, height, residential in zones:
                    far_jitter = Decimal(str(round(float(far) * random.uniform(0.85, 1.15), 2)))
                    height_jitter = int(height * random.uniform(0.9, 1.1))
                    ZoningDistrict.objects.get_or_create(
                        neighborhood=hood,
                        code=code,
                        defaults={
                            "category": category,
                            "max_far": far_jitter,
                            "max_height_ft": height_jitter,
                            "residential_allowed": residential,
                        },
                    )
        self.stdout.write(f"  Zoning districts: {ZoningDistrict.objects.count()}")

    def _seed_market_data(self):
        base_prices = {"MN": 950000, "BK": 720000, "QN": 540000, "BX": 380000, "SI": 490000}
        base_rents = {"MN": 3800, "BK": 2900, "QN": 2200, "BX": 1700, "SI": 1900}
        quarters = []
        for year in range(2023, 2027):
            for q_month in [1, 4, 7, 10]:
                quarters.append(date(year, q_month, 1))

        for hood in Neighborhood.objects.select_related("borough"):
            bp = base_prices[hood.borough.code]
            br = base_rents[hood.borough.code]
            hood_factor = random.uniform(0.8, 1.2)
            for i, q in enumerate(quarters):
                growth = 1 + (i * 0.012)
                price = round(bp * hood_factor * growth * random.uniform(0.95, 1.05), 2)
                rent = round(br * hood_factor * growth * random.uniform(0.96, 1.04), 2)
                vacancy = round(random.uniform(2.0, 9.0), 2)
                permits = random.randint(5, 120)
                MarketData.objects.get_or_create(
                    neighborhood=hood,
                    period=q,
                    defaults={
                        "median_sale_price": Decimal(str(price)),
                        "median_rent": Decimal(str(rent)),
                        "vacancy_rate_pct": Decimal(str(vacancy)),
                        "permits_issued": permits,
                    },
                )
        self.stdout.write(f"  Market data records: {MarketData.objects.count()}")

    def _seed_demographics(self):
        base_pops = {"MN": 55000, "BK": 68000, "QN": 52000, "BX": 60000, "SI": 35000}
        base_incomes = {"MN": 85000, "BK": 62000, "QN": 58000, "BX": 40000, "SI": 72000}

        for hood in Neighborhood.objects.select_related("borough"):
            bpop = base_pops[hood.borough.code]
            binc = base_incomes[hood.borough.code]
            hood_factor = random.uniform(0.7, 1.4)
            for year in range(2020, 2027):
                growth_pct = round(random.uniform(-0.5, 3.5), 2)
                pop = int(bpop * hood_factor * (1 + (year - 2020) * 0.01))
                income = round(binc * hood_factor * (1 + (year - 2020) * 0.02) * random.uniform(0.95, 1.05), 2)
                transit = round(random.uniform(30, 98), 1)
                if hood.borough.code == "MN":
                    transit = round(random.uniform(70, 99), 1)
                elif hood.borough.code == "SI":
                    transit = round(random.uniform(20, 55), 1)
                DemographicProfile.objects.get_or_create(
                    neighborhood=hood,
                    year=year,
                    defaults={
                        "population": pop,
                        "median_income": Decimal(str(income)),
                        "population_growth_pct": Decimal(str(growth_pct)),
                        "transit_score": Decimal(str(transit)),
                    },
                )
        self.stdout.write(f"  Demographic profiles: {DemographicProfile.objects.count()}")

    def _create_demo_user(self):
        if not User.objects.filter(username="demo").exists():
            User.objects.create_user(
                username="demo", email="demo@nychousing.dev", password="demo1234"
            )
            self.stdout.write("  Demo user created (demo / demo1234)")
