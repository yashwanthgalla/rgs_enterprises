from rest_framework import viewsets, permissions
from apps.accounts.permissions import IsAdminUserRole
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user')
        domain = self.request.query_params.get('domain')
        if domain:
            qs = qs.filter(domain=domain.upper())
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action.upper())
        target_table = self.request.query_params.get('target_table')
        if target_table:
            qs = qs.filter(target_table=target_table)
        return qs.order_by('-timestamp')
