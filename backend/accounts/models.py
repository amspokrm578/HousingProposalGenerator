from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """
    Lightweight extension of the core Django user for role-based behavior.

    For Green-Tape we introduce a Public Development Outcome (PDO) role that
    unlocks additional features and dashboards focused on public-interest
    development outcomes.
    """

    class Role(models.TextChoices):
        STANDARD = "standard", "Standard"
        PDO = "pdo", "Public Development Outcome"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(
        max_length=50,
        choices=Role.choices,
        default=Role.STANDARD,
    )
    organization = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User profile"
        verbose_name_plural = "User profiles"

    def __str__(self) -> str:
        return f"{self.user.username} ({self.get_role_display()})"


def ensure_user_profile(user) -> "UserProfile":
    """
    Convenience helper to guarantee that a UserProfile exists for a given user.

    This is safe to call from views/serializers before accessing role-dependent
    behavior and keeps the rest of the codebase simple.
    """

    from django.contrib.auth import get_user_model

    UserModel = get_user_model()
    if not isinstance(user, UserModel):
        raise TypeError("ensure_user_profile expects a Django user instance.")

    profile, _created = UserProfile.objects.get_or_create(user=user)
    return profile

