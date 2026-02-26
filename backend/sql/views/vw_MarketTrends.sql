CREATE OR ALTER VIEW vw_MarketTrends AS
SELECT
    m.id,
    m.neighborhood_id,
    n.name AS neighborhood_name,
    m.period,
    m.median_sale_price,
    m.median_rent,
    CAST(
        (m.median_sale_price - LAG(m.median_sale_price) OVER (
            PARTITION BY m.neighborhood_id ORDER BY m.period
        ))
        / NULLIF(LAG(m.median_sale_price) OVER (
            PARTITION BY m.neighborhood_id ORDER BY m.period
        ), 0) * 100
        AS DECIMAL(7,2)
    ) AS price_change_pct,
    CAST(
        (m.median_rent - LAG(m.median_rent) OVER (
            PARTITION BY m.neighborhood_id ORDER BY m.period
        ))
        / NULLIF(LAG(m.median_rent) OVER (
            PARTITION BY m.neighborhood_id ORDER BY m.period
        ), 0) * 100
        AS DECIMAL(7,2)
    ) AS rent_change_pct
FROM proposals_marketdata m
INNER JOIN proposals_neighborhood n ON n.id = m.neighborhood_id;
