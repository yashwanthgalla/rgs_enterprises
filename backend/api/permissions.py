from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """
    Allows access only to authenticated users with the ADMIN role.
    """
    message = "Access restricted to Administrators only."

    def has_permission(self, request, view):
        return bool(
            request.user and
            getattr(request.user, 'is_authenticated', False) and
            getattr(request.user, 'role', '').upper() == 'ADMIN'
        )


class IsAdminOrManagerRole(permissions.BasePermission):
    """
    Allows access only to authenticated users with ADMIN or MANAGER roles.
    """
    message = "Access restricted to Administrators and Managers."

    def has_permission(self, request, view):
        return bool(
            request.user and
            getattr(request.user, 'is_authenticated', False) and
            getattr(request.user, 'role', '').upper() in ['ADMIN', 'MANAGER']
        )


class IsManagerOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access to all authenticated users (VIEWER, MANAGER, ADMIN),
    but restricts write operations (POST, PUT, PATCH, DELETE) to ADMIN and MANAGER.
    """
    message = "Modifications are restricted to Administrators and Managers."

    def has_permission(self, request, view):
        if not (request.user and getattr(request.user, 'is_authenticated', False)):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(request.user, 'role', '').upper() in ['ADMIN', 'MANAGER']


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read-only access to all users (including unauthenticated for public branding),
    but restricts write operations to Administrators.
    """
    message = "Modifications are restricted to Administrators only."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not (request.user and getattr(request.user, 'is_authenticated', False)):
            return False
        return getattr(request.user, 'role', '').upper() == 'ADMIN'
