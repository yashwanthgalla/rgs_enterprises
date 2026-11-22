from django.db import models
from apps.core.models import SoftDeletableModel


class AssetCategory(models.TextChoices):
    IT_HARDWARE = 'IT_HARDWARE', 'IT Hardware'
    MATERIAL_HANDLING = 'MATERIAL_HANDLING', 'Material Handling'
    FURNITURE = 'FURNITURE', 'Furniture'
    ELECTRICAL = 'ELECTRICAL', 'Electrical'
    SECURITY = 'SECURITY', 'Security'
    OTHER = 'OTHER', 'Other'


class AssetCondition(models.TextChoices):
    WORKING = 'WORKING', 'Working'
    DAMAGED = 'DAMAGED', 'Damaged'
    UNDER_REPAIR = 'UNDER_REPAIR', 'Under Repair'
    RETIRED = 'RETIRED', 'Retired'


class Equipment(SoftDeletableModel):
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='equipment'
    )
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=AssetCategory.choices, default=AssetCategory.OTHER)
    serial_number = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    condition = models.CharField(max_length=30, choices=AssetCondition.choices, default=AssetCondition.WORKING)

    class Meta:
        db_table = 'assets_equipment'
        ordering = ['id']

    def __str__(self):
        return f"{self.name} ({self.category}) @ {self.hub.name}"
