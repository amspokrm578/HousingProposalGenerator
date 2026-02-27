"""Create SQLite views for analytics. Only runs when using SQLite."""

from django.db import migrations, connection


def create_sqlite_views(apps, schema_editor):
    if connection.vendor != "sqlite":
        return

    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE VIEW IF NOT EXISTS vw_NeighborhoodRankings AS
            WITH LatestMarket AS (
                SELECT neighborhood_id, median_sale_price, median_rent, vacancy_rate_pct,
                    ROW_NUMBER() OVER (PARTITION BY neighborhood_id ORDER BY period DESC) AS rn
                FROM proposals_marketdata
            ),
            LatestDemo AS (
                SELECT neighborhood_id, population, median_income, population_growth_pct, transit_score,
                    ROW_NUMBER() OVER (PARTITION BY neighborhood_id ORDER BY year DESC) AS rn
                FROM proposals_demographicprofile
            ),
            Scored AS (
                SELECT n.id AS neighborhood_id, n.name AS neighborhood_name, b.name AS borough_name,
                    COALESCE(m.median_sale_price, 0) AS median_sale_price,
                    COALESCE(m.median_rent, 0) AS median_rent,
                    COALESCE(m.vacancy_rate_pct, 0) AS vacancy_rate_pct,
                    COALESCE(d.population, 0) AS population,
                    COALESCE(d.median_income, 0) AS median_income,
                    COALESCE(d.transit_score, 0) AS transit_score,
                    (100 - COALESCE(m.vacancy_rate_pct, 0) * 5)
                        + (COALESCE(d.population_growth_pct, 0) * 10)
                        + (COALESCE(d.transit_score, 0) * 0.3)
                        + (CASE WHEN COALESCE(d.median_income, 0) > 60000 THEN 15
                            ELSE COALESCE(d.median_income, 0) / 60000.0 * 15 END)
                    AS development_score
                FROM proposals_neighborhood n
                INNER JOIN proposals_borough b ON b.id = n.borough_id
                LEFT JOIN LatestMarket m ON m.neighborhood_id = n.id AND m.rn = 1
                LEFT JOIN LatestDemo d ON d.neighborhood_id = n.id AND d.rn = 1
            )
            SELECT neighborhood_id, neighborhood_name, borough_name,
                median_sale_price, median_rent, vacancy_rate_pct, population, median_income, transit_score,
                development_score,
                RANK() OVER (ORDER BY development_score DESC) AS overall_rank,
                NTILE(4) OVER (ORDER BY development_score DESC) AS quartile
            FROM Scored
        """)

        cursor.execute("""
            CREATE VIEW IF NOT EXISTS vw_MarketTrends AS
            SELECT m.id, m.neighborhood_id, n.name AS neighborhood_name, m.period,
                m.median_sale_price, m.median_rent,
                (m.median_sale_price - LAG(m.median_sale_price) OVER (
                    PARTITION BY m.neighborhood_id ORDER BY m.period
                )) / NULLIF(LAG(m.median_sale_price) OVER (
                    PARTITION BY m.neighborhood_id ORDER BY m.period
                ), 0) * 100 AS price_change_pct,
                (m.median_rent - LAG(m.median_rent) OVER (
                    PARTITION BY m.neighborhood_id ORDER BY m.period
                )) / NULLIF(LAG(m.median_rent) OVER (
                    PARTITION BY m.neighborhood_id ORDER BY m.period
                ), 0) * 100 AS rent_change_pct
            FROM proposals_marketdata m
            INNER JOIN proposals_neighborhood n ON n.id = m.neighborhood_id
        """)

        cursor.execute("""
            CREATE VIEW IF NOT EXISTS vw_ProposalDashboardSummary AS
            SELECT b.name AS borough_name,
                COUNT(p.id) AS total_proposals,
                COALESCE(SUM(p.total_units), 0) AS total_units,
                AVG(p.feasibility_score) AS avg_feasibility_score,
                COALESCE(SUM(p.estimated_cost), 0) AS total_estimated_cost,
                COALESCE(SUM(p.projected_revenue), 0) AS total_projected_revenue
            FROM proposals_borough b
            LEFT JOIN proposals_neighborhood n ON n.borough_id = b.id
            LEFT JOIN proposals_proposal p ON p.neighborhood_id = n.id
            GROUP BY b.name
        """)


def drop_sqlite_views(apps, schema_editor):
    if connection.vendor != "sqlite":
        return
    with connection.cursor() as cursor:
        for view in ["vw_NeighborhoodRankings", "vw_MarketTrends", "vw_ProposalDashboardSummary"]:
            cursor.execute(f"DROP VIEW IF EXISTS {view}")


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0001_initial"),
        ("proposals", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_sqlite_views, drop_sqlite_views),
    ]
