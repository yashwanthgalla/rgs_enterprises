from rest_framework import permissions
from apps.accounts.models import UserRole


class HubAccessPermission(permissions.BasePermission):
    """
    ADMIN: full access (create, read, update, delete).
    MANAGER: read, create, and update (no deletion).
    VIEWER: read-only access (GET, HEAD, OPTIONS).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        role = getattr(request.user, 'role', None)

        if role == UserRole.ADMIN:
            return True

        if role == UserRole.MANAGER:
            # Managers cannot delete hubs
            if request.method == 'DELETE':
                return False
            return True

        if role == UserRole.VIEWER:
            return request.method in permissions.SAFE_METHODS

        return False


class CanDeleteHub(permissions.BasePermission):
    message = "Only Administrators are authorized to soft-delete Hub facilities."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class CanRevealCCTV(permissions.BasePermission):
    message = "Administrator role required for CCTV security credential access."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )
