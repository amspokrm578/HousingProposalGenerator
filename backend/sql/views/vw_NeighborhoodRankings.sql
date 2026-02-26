CREATE OR ALTER VIEW vw_NeighborhoodRankings AS
WITH LatestMarket AS (
    SELECT
        m.neighborhood_id,
        m.median_sale_price,
        m.median_rent,
        m.vacancy_rate_pct,
        ROW_NUMBER() OVER (PARTITION BY m.neighborhood_id ORDER BY m.period DESC) AS rn
    FROM proposals_marketdata m
),
LatestDemo AS (
    SELECT
        d.neighborhood_id,
        d.population,
        d.median_income,
        d.population_growth_pct,
        d.transit_score,
        ROW_NUMBER() OVER (PARTITION BY d.neighborhood_id ORDER BY d.year DESC) AS rn
    FROM proposals_demographicprofile d
),
Scored AS (
    SELECT
        n.id AS neighborhood_id,
        n.name AS neighborhood_name,
        b.name AS borough_name,
        m.median_sale_price,
        m.median_rent,
        m.vacancy_rate_pct,
        d.population,
        d.median_income,
        d.transit_score,
        -- Composite development potential score
        CAST(
            (100 - m.vacancy_rate_pct * 5)
            + (d.population_growth_pct * 10)
            + (d.transit_score * 0.3)
            + (CASE WHEN d.median_income > 60000 THEN 15 ELSE d.median_income / 60000.0 * 15 END)
            AS DECIMAL(7,2)
        ) AS development_score
    FROM proposals_neighborhood n
    INNER JOIN proposals_borough b ON b.id = n.borough_id
    LEFT JOIN LatestMarket m ON m.neighborhood_id = n.id AND m.rn = 1
    LEFT JOIN LatestDemo d ON d.neighborhood_id = n.id AND d.rn = 1
)
SELECT
    neighborhood_id,
    neighborhood_name,
    borough_name,
    ISNULL(median_sale_price, 0) AS median_sale_price,
    ISNULL(median_rent, 0) AS median_rent,
    ISNULL(vacancy_rate_pct, 0) AS vacancy_rate_pct,
    ISNULL(population, 0) AS population,
    ISNULL(median_income, 0) AS median_income,
    ISNULL(transit_score, 0) AS transit_score,
    ISNULL(development_score, 0) AS development_score,
    RANK() OVER (ORDER BY development_score DESC) AS overall_rank,
    NTILE(4) OVER (ORDER BY development_score DESC) AS quartile
FROM Scored;
