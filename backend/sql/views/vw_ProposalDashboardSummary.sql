CREATE OR ALTER VIEW vw_ProposalDashboardSummary AS
SELECT
    b.name AS borough_name,
    COUNT(p.id) AS total_proposals,
    ISNULL(SUM(p.total_units), 0) AS total_units,
    AVG(p.feasibility_score) AS avg_feasibility_score,
    ISNULL(SUM(p.estimated_cost), 0) AS total_estimated_cost,
    ISNULL(SUM(p.projected_revenue), 0) AS total_projected_revenue
FROM proposals_borough b
LEFT JOIN proposals_neighborhood n ON n.borough_id = b.id
LEFT JOIN proposals_proposal p ON p.neighborhood_id = n.id
GROUP BY b.name;
