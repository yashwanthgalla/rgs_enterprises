from django.db import models
from django.utils import timezone


class AuditAction(models.TextChoices):
    CREATE = 'CREATE', 'Create'
    UPDATE = 'UPDATE', 'Update'
    DELETE = 'DELETE', 'Delete'
    CCTV_REVEAL = 'CCTV_REVEAL', 'CCTV Reveal'
    LOGIN = 'LOGIN', 'Login'
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'


class AuditDomain(models.TextChoices):
    HUBS = 'HUBS', 'Hubs'
    FINANCE = 'FINANCE', 'Finance'
    HR = 'HR', 'HR'
    ASSETS = 'ASSETS', 'Assets'
    DOCUMENTS = 'DOCUMENTS', 'Documents'
    AUTH = 'AUTH', 'Auth'


class AuditLog(models.Model):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='audit_entries'
    )
    action = models.CharField(max_length=30, choices=AuditAction.choices)
    domain = models.CharField(max_length=30, choices=AuditDomain.choices)
    target_table = models.CharField(max_length=100)
    target_id = models.BigIntegerField(null=True, blank=True)
    hub_code_snapshot = models.CharField(max_length=20, null=True, blank=True)
    hub_name_snapshot = models.CharField(max_length=200, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['domain', 'action']),
            models.Index(fields=['target_table', 'target_id']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else 'SYSTEM'
        return f"[{self.timestamp}] {user_str} - {self.action} on {self.target_table}#{self.target_id}"
