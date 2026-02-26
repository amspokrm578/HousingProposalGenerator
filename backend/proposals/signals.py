import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Proposal

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Proposal)
def on_proposal_saved(sender, instance, created, update_fields, **kwargs):
    """Trigger feasibility recalculation when key fields change."""
    recalc_fields = {"lot_size_sqft", "total_units", "neighborhood_id"}

    if created:
        return

    if update_fields is not None:
        changed = set(update_fields) & recalc_fields
        if not changed:
            return

    from .tasks import calculate_feasibility_score
    calculate_feasibility_score.delay(instance.id)
    logger.info("Queued feasibility recalc for proposal %s", instance.id)
