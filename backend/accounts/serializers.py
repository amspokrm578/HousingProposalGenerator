from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    is_pdo = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_pdo",
        ]

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        if profile is None:
            return UserProfile.Role.STANDARD
        return profile.role

    def get_is_pdo(self, obj) -> bool:
        profile = getattr(obj, "profile", None)
        if profile is None:
            return False
        return profile.role == UserProfile.Role.PDO

