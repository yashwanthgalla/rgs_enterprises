from django.db import models
from django.utils import timezone
from django.conf import settings


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditableModel(TimeStampedModel):
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='%(app_label)s_%(class)s_created',
        null=True,
        blank=True
    )

    class Meta:
        abstract = True


class SoftDeletableModel(AuditableModel):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])


class State(TimeStampedModel):
    code = models.CharField(max_length=2, unique=True, db_index=True)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'core_states'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class OrganizationSettings(TimeStampedModel):
    company_name = models.CharField(max_length=200, default='RGS Enterprises')
    company_tagline = models.CharField(max_length=255, blank=True, null=True)
    default_currency = models.CharField(max_length=10, default='₹')
    alert_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    company_address = models.TextField(blank=True, null=True)
    logo_url = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'core_organization_settings'

    def __str__(self):
        return self.company_name
