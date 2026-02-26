import logging

from celery import shared_task
from django.db import connection

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def calculate_feasibility_score(self, proposal_id: int):
    """Execute sp_CalculateFeasibilityScore stored procedure."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("EXEC sp_CalculateFeasibilityScore @proposal_id = %s", [proposal_id])
            row = cursor.fetchone()
            score = row[0] if row else None
        logger.info("Feasibility score for proposal %s: %s", proposal_id, score)
        return {"proposal_id": proposal_id, "feasibility_score": str(score)}
    except Exception as exc:
        logger.error("Failed to calculate feasibility score for %s: %s", proposal_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_financial_projections(self, proposal_id: int, years: int = 10):
    """Execute sp_GenerateFinancialProjections stored procedure."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "EXEC sp_GenerateFinancialProjections @proposal_id = %s, @projection_years = %s",
                [proposal_id, years],
            )
        logger.info("Financial projections generated for proposal %s (%s years)", proposal_id, years)
        return {"proposal_id": proposal_id, "years": years}
    except Exception as exc:
        logger.error("Failed to generate projections for %s: %s", proposal_id, exc)
        raise self.retry(exc=exc)


@shared_task
def refresh_market_data_cache():
    """Periodic task: invalidate and warm the market data cache."""
    from django.core.cache import cache
    cache.delete_pattern("*neighborhood*")
    cache.delete_pattern("*market*")
    logger.info("Market data cache cleared.")
