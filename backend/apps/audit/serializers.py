from rest_framework import serializers
from apps.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    userEmail = serializers.CharField(source='user.email', read_only=True)
    userFullName = serializers.CharField(source='user.full_name', read_only=True)
    hubCode = serializers.CharField(source='hub_code_snapshot', read_only=True)
    hubName = serializers.CharField(source='hub_name_snapshot', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'userEmail', 'userFullName', 'action', 'domain',
            'target_table', 'target_id', 'hubCode', 'hubName',
            'ip_address', 'old_values', 'new_values', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
