CREATE OR ALTER PROCEDURE sp_CalculateFeasibilityScore
    @proposal_id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @score DECIMAL(5,2);
    DECLARE @neighborhood_id BIGINT;
    DECLARE @lot_size DECIMAL(12,2);
    DECLARE @total_units INT;

    SELECT
        @neighborhood_id = neighborhood_id,
        @lot_size = lot_size_sqft,
        @total_units = total_units
    FROM proposals_proposal
    WHERE id = @proposal_id;

    IF @neighborhood_id IS NULL
    BEGIN
        RAISERROR('Proposal not found', 16, 1);
        RETURN;
    END;

    -- Weighted scoring across market, demographic, and zoning factors
    WITH LatestMarket AS (
        SELECT TOP 1
            median_sale_price,
            median_rent,
            vacancy_rate_pct,
            permits_issued
        FROM proposals_marketdata
        WHERE neighborhood_id = @neighborhood_id
        ORDER BY period DESC
    ),
    LatestDemo AS (
        SELECT TOP 1
            population,
            median_income,
            population_growth_pct,
            transit_score
        FROM proposals_demographicprofile
        WHERE neighborhood_id = @neighborhood_id
        ORDER BY year DESC
    ),
    ZoningScore AS (
        SELECT
            AVG(max_far) AS avg_far,
            MAX(max_height_ft) AS max_height,
            CAST(SUM(CASE WHEN residential_allowed = 1 THEN 1 ELSE 0 END) AS FLOAT)
                / NULLIF(COUNT(*), 0) * 100 AS residential_pct
        FROM proposals_zoningdistrict
        WHERE neighborhood_id = @neighborhood_id
    )
    SELECT @score = (
        -- Market strength (30% weight): low vacancy + high rent = good
        (CASE
            WHEN m.vacancy_rate_pct < 3 THEN 30
            WHEN m.vacancy_rate_pct < 5 THEN 25
            WHEN m.vacancy_rate_pct < 8 THEN 18
            ELSE 10
        END)
        -- Demographic strength (25% weight): growth + income + transit
        + (CASE
            WHEN d.population_growth_pct > 2 THEN 10 ELSE d.population_growth_pct * 5
        END)
        + (CASE
            WHEN d.median_income > 80000 THEN 8
            WHEN d.median_income > 50000 THEN 6
            ELSE 3
        END)
        + (d.transit_score / 100.0 * 7)
        -- Zoning favorability (25% weight)
        + (CASE
            WHEN z.avg_far > 5 THEN 15
            WHEN z.avg_far > 3 THEN 12
            WHEN z.avg_far > 1.5 THEN 8
            ELSE 4
        END)
        + (z.residential_pct / 100.0 * 10)
        -- Density efficiency (20% weight): units per sqft ratio
        + (CASE
            WHEN @total_units * 1.0 / NULLIF(@lot_size, 0) * 1000 BETWEEN 5 AND 20 THEN 20
            WHEN @total_units * 1.0 / NULLIF(@lot_size, 0) * 1000 BETWEEN 2 AND 30 THEN 14
            ELSE 8
        END)
    )
    FROM LatestMarket m
    CROSS JOIN LatestDemo d
    CROSS JOIN ZoningScore z;

    SET @score = ISNULL(@score, 50.00);

    -- Clamp to 0-100
    IF @score > 100 SET @score = 100;
    IF @score < 0 SET @score = 0;

    UPDATE proposals_proposal
    SET feasibility_score = @score
    WHERE id = @proposal_id;

    SELECT @score AS feasibility_score;
END;
