from rest_framework import permissions
from apps.accounts.models import UserRole


class IsAdminUserRole(permissions.BasePermission):
    message = "Only Administrators have permission to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) == UserRole.ADMIN
        )


class IsManagerOrAdmin(permissions.BasePermission):
    message = "Administrator or Manager permission required."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'role', None) in (UserRole.ADMIN, UserRole.MANAGER)
        )


class RoleBasedModelPermission(permissions.BasePermission):
    """
    ADMIN: full read/write/delete.
    MANAGER: read and create/update, cannot soft-delete hubs or reveal sensitive CCTV credentials.
    VIEWER: safe read-only methods (GET, HEAD, OPTIONS).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        role = getattr(request.user, 'role', None)

        if role == UserRole.ADMIN:
            return True

        if role == UserRole.MANAGER:
            # Managers cannot hard-delete or execute destructive actions
            if request.method == 'DELETE':
                return False
            return True

        if role == UserRole.VIEWER:
            return request.method in permissions.SAFE_METHODS

        return False
