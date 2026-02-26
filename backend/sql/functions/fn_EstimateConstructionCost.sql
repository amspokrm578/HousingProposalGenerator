CREATE OR ALTER FUNCTION fn_EstimateConstructionCost(
    @lot_sqft DECIMAL(12,2),
    @unit_count INT,
    @borough_code VARCHAR(5)
)
RETURNS DECIMAL(14,2)
AS
BEGIN
    DECLARE @base_cost_per_sqft DECIMAL(8,2) = 350.00;
    DECLARE @borough_multiplier DECIMAL(4,2);
    DECLARE @unit_premium DECIMAL(14,2);
    DECLARE @total_cost DECIMAL(14,2);

    -- Borough-specific multipliers reflecting NYC construction cost variation
    SET @borough_multiplier = CASE @borough_code
        WHEN 'MN' THEN 1.85   -- Manhattan
        WHEN 'BK' THEN 1.45   -- Brooklyn
        WHEN 'QN' THEN 1.20   -- Queens
        WHEN 'BX' THEN 1.10   -- Bronx
        WHEN 'SI' THEN 1.05   -- Staten Island
        ELSE 1.25
    END;

    SET @unit_premium = @unit_count * 25000.00;

    SET @total_cost = (@lot_sqft * @base_cost_per_sqft * @borough_multiplier) + @unit_premium;

    RETURN @total_cost;
END;
