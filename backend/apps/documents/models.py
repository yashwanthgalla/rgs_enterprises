from django.db import models
from apps.core.models import SoftDeletableModel


class DocumentCategory(models.TextChoices):
    LEASE_AGREEMENT = 'LEASE_AGREEMENT', 'Lease Agreement'
    LABOUR_LICENCE = 'LABOUR_LICENCE', 'Labour Licence'
    TRADE_LICENCE = 'TRADE_LICENCE', 'Trade Licence'
    ELECTRICITY_BILL = 'ELECTRICITY_BILL', 'Electricity Bill'
    ID_PROOF = 'ID_PROOF', 'ID Proof'
    ASSET_INVOICE = 'ASSET_INVOICE', 'Asset Invoice'
    OTHER = 'OTHER', 'Other'


class Document(SoftDeletableModel):
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='documents'
    )
    category = models.CharField(max_length=30, choices=DocumentCategory.choices, default=DocumentCategory.OTHER)
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_size_bytes = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, default='application/octet-stream')
    storage_bucket = models.CharField(max_length=100, default='hub-documents')

    class Meta:
        db_table = 'documents_documents'
        ordering = ['-created_at']

    def __str__(self):
        hub_str = self.hub.name if self.hub else "General"
        return f"{self.file_name} ({self.category}) - {hub_str}"
