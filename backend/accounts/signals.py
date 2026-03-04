from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import UserProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically create a UserProfile when a new user is created.

    This keeps role management consistent even for users created via the admin,
    management commands, or fixtures.
    """

    if created:
        UserProfile.objects.get_or_create(user=instance)

