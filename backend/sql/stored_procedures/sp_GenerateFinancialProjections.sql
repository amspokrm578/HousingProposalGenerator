CREATE OR ALTER PROCEDURE sp_GenerateFinancialProjections
    @proposal_id BIGINT,
    @projection_years INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @estimated_cost DECIMAL(14,2);
    DECLARE @annual_revenue DECIMAL(14,2);
    DECLARE @annual_expense_rate DECIMAL(5,4) = 0.35;   -- 35% of revenue
    DECLARE @annual_growth_rate DECIMAL(5,4) = 0.03;     -- 3% annual growth
    DECLARE @expense_growth_rate DECIMAL(5,4) = 0.025;   -- 2.5% expense inflation

    SELECT @estimated_cost = estimated_cost
    FROM proposals_proposal
    WHERE id = @proposal_id;

    IF @estimated_cost IS NULL
    BEGIN
        RAISERROR('Proposal not found or missing cost estimate', 16, 1);
        RETURN;
    END;

    -- Annual revenue = sum of (unit_count * projected_rent * 12)
    SELECT @annual_revenue = SUM(count * projected_rent * 12)
    FROM proposals_proposalunitmix
    WHERE proposal_id = @proposal_id;

    IF @annual_revenue IS NULL OR @annual_revenue = 0
    BEGIN
        RAISERROR('No unit mix defined for this proposal', 16, 1);
        RETURN;
    END;

    DELETE FROM proposals_financialprojection
    WHERE proposal_id = @proposal_id;

    ;WITH YearSequence AS (
        SELECT 1 AS yr
        UNION ALL
        SELECT yr + 1 FROM YearSequence WHERE yr < @projection_years
    ),
    Projections AS (
        SELECT
            yr,
            CAST(@annual_revenue * POWER(1 + @annual_growth_rate, yr - 1) AS DECIMAL(14,2)) AS revenue,
            CAST(
                (@annual_revenue * @annual_expense_rate) * POWER(1 + @expense_growth_rate, yr - 1)
                + CASE WHEN yr = 1 THEN @estimated_cost ELSE 0 END
                AS DECIMAL(14,2)
            ) AS expenses
        FROM YearSequence
    )
    INSERT INTO proposals_financialprojection (proposal_id, year, revenue, expenses, net_income, cumulative_roi)
    SELECT
        @proposal_id,
        yr,
        revenue,
        expenses,
        revenue - expenses AS net_income,
        CAST(
            (SUM(revenue - expenses) OVER (ORDER BY yr ROWS UNBOUNDED PRECEDING))
            / NULLIF(@estimated_cost, 0) * 100
            AS DECIMAL(7,2)
        ) AS cumulative_roi
    FROM Projections
    ORDER BY yr
    OPTION (MAXRECURSION 100);

    UPDATE proposals_proposal
    SET projected_revenue = (
        SELECT SUM(revenue)
        FROM proposals_financialprojection
        WHERE proposal_id = @proposal_id
    )
    WHERE id = @proposal_id;
END;
