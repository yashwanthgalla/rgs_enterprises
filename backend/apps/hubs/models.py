from django.db import models
from django.utils import timezone
from apps.core.models import SoftDeletableModel, TimeStampedModel, AuditableModel


class HubStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'
    UNDER_MAINTENANCE = 'UNDER_MAINTENANCE', 'Under Maintenance'


class HubModel(models.TextChoices):
    OSH = 'OSH', 'OSH'
    COMPANY_OWNED = 'COMPANY_OWNED', 'Company Owned'
    LEASED = 'LEASED', 'Leased'


class OccupancyStatus(models.TextChoices):
    OCCUPIED = 'OCCUPIED', 'Occupied'
    VACANT = 'VACANT', 'Vacant'
    UNDER_NOTICE = 'UNDER_NOTICE', 'Under Notice'


class Hub(SoftDeletableModel):
    state = models.ForeignKey(
        'core.State',
        on_delete=models.PROTECT,
        related_name='hubs'
    )
    code_number = models.PositiveIntegerField()
    code = models.CharField(max_length=20, db_index=True)
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100, db_index=True)
    postal_code = models.CharField(max_length=10, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    maps_url = models.TextField(null=True, blank=True)
    total_capacity = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    capacity_unit = models.CharField(max_length=20, default='sq ft')
    status = models.CharField(max_length=30, choices=HubStatus.choices, default=HubStatus.ACTIVE)
    model = models.CharField(max_length=30, choices=HubModel.choices, default=HubModel.OSH)
    occupancy_status = models.CharField(
        max_length=30,
        choices=OccupancyStatus.choices,
        default=OccupancyStatus.VACANT
    )
    tenant = models.CharField(max_length=200, null=True, blank=True)
    electricity_provider = models.CharField(max_length=100, null=True, blank=True)
    electricity_service_number = models.CharField(max_length=100, null=True, blank=True)
    owner_name = models.CharField(max_length=200, null=True, blank=True)
    owner_address = models.TextField(null=True, blank=True)
    owner_mobile = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = 'hubs_hubs'
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(
                fields=['state', 'code_number'],
                condition=models.Q(is_deleted=False),
                name='uq_hubs_active_state_code_number'
            ),
            models.UniqueConstraint(
                fields=['code'],
                condition=models.Q(is_deleted=False),
                name='uq_hubs_active_code'
            ),
            models.CheckConstraint(
                condition=models.Q(code__regex=r'^RGS#[A-Z]{2}\d{2,3}$'),
                name='chk_hub_code_format'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class ContactRole(models.TextChoices):
    HUB_POC = 'HUB_POC', 'Hub POC'
    OPS_POC = 'OPS_POC', 'Operations POC'
    LEASE = 'LEASE', 'Lease POC'


class HubContact(AuditableModel):
    hub = models.ForeignKey(Hub, on_delete=models.PROTECT, related_name='contacts')
    role = models.CharField(max_length=20, choices=ContactRole.choices)
    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(null=True, blank=True)

    class Meta:
        db_table = 'hubs_contacts'
        ordering = ['id']

    def __str__(self):
        return f"{self.name} ({self.role}) - {self.hub.name}"


class LicenceType(models.TextChoices):
    LABOUR = 'LABOUR', 'Labour Licence'
    TRADE = 'TRADE', 'Trade Licence'


class HubLicence(AuditableModel):
    hub = models.ForeignKey(Hub, on_delete=models.PROTECT, related_name='licences')
    type = models.CharField(max_length=20, choices=LicenceType.choices)
    is_available = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    document_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'hubs_licences'
        ordering = ['id']

    def __str__(self):
        return f"{self.type} - {self.hub.name} (Valid: {self.expiry_date})"


class HubCCTVCredential(AuditableModel):
    hub = models.OneToOneField(Hub, on_delete=models.PROTECT, related_name='cctv')
    username = models.CharField(max_length=100)
    password_encrypted = models.TextField()
    access_url = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'hubs_cctv_credentials'

    def __str__(self):
        return f"CCTV for {self.hub.name}"


class HubBroadbandConnection(AuditableModel):
    hub = models.ForeignKey(Hub, on_delete=models.PROTECT, related_name='broadband_connections')
    provider = models.CharField(max_length=100)
    plan_name = models.CharField(max_length=100, null=True, blank=True)
    speed_mbps = models.IntegerField(null=True, blank=True)
    registered_mobile = models.CharField(max_length=20, null=True, blank=True)
    user_id_code = models.CharField(max_length=100, null=True, blank=True)
    current_plan_end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'hubs_broadband_connections'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.provider} ({self.hub.name})"


class HubCodeHistory(models.Model):
    hub = models.ForeignKey(Hub, on_delete=models.PROTECT, related_name='code_history')
    code = models.CharField(max_length=20)
    assigned_at = models.DateTimeField(default=timezone.now)
    released_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=255, null=True, blank=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'hubs_code_history'
        ordering = ['-assigned_at']

    def __str__(self):
        status = "Active" if not self.released_at else f"Released at {self.released_at}"
        return f"{self.code} -> {self.hub.name} ({status})"
