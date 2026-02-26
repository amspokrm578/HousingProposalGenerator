from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsProposalOwnerOrReadOnly(BasePermission):
    """Allow full access to the proposal owner; read-only for everyone else."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.owner == request.user
