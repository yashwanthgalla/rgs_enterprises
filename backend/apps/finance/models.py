from django.db import models
from django.utils import timezone
from apps.core.models import SoftDeletableModel, AuditableModel


class RentAgreement(SoftDeletableModel):
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='rent_agreements'
    )
    agreement_number = models.CharField(max_length=100, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_rent = models.DecimalField(max_digits=14, decimal_places=2)
    refundable_advance = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_setup_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    tds_applied = models.BooleanField(default=True)
    tds_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    gst_applied = models.BooleanField(default=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    escalation_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'finance_rent_agreements'
        ordering = ['-start_date']
        constraints = [
            models.UniqueConstraint(
                fields=['hub'],
                condition=models.Q(is_active=True, is_deleted=False),
                name='uq_finance_active_hub_agreement'
            ),
            models.CheckConstraint(
                condition=models.Q(end_date__gt=models.F('start_date')),
                name='chk_agreement_end_date_after_start'
            )
        ]

    def __str__(self):
        return f"Agreement for {self.hub.name} (₹{self.monthly_rent}/mo)"


class InvoiceStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    PAID = 'PAID', 'Paid'
    OVERDUE = 'OVERDUE', 'Overdue'


class RentInvoice(AuditableModel):
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='rent_invoices'
    )
    agreement = models.ForeignKey(
        RentAgreement,
        on_delete=models.PROTECT,
        related_name='invoices'
    )
    period_month = models.DateField(help_text="First day of billing calendar month")
    base_rent = models.DecimalField(max_digits=14, decimal_places=2)
    tds_applied = models.BooleanField(default=True)
    tds_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    tds_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    gst_applied = models.BooleanField(default=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    gst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    net_payable = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=30, choices=InvoiceStatus.choices, default=InvoiceStatus.PENDING)
    due_date = models.DateField()
    hub_code_snapshot = models.CharField(max_length=20)
    hub_name_snapshot = models.CharField(max_length=200)

    class Meta:
        db_table = 'finance_rent_invoices'
        ordering = ['-period_month']
        constraints = [
            models.UniqueConstraint(
                fields=['hub', 'period_month'],
                name='uq_finance_hub_invoice_month'
            )
        ]

    def __str__(self):
        return f"Rent Invoice {self.period_month.strftime('%b %Y')} - {self.hub_code_snapshot} (Net: ₹{self.net_payable})"


class PaymentMethod(models.TextChoices):
    BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer (NEFT/RTGS/IMPS)'
    UPI = 'UPI', 'UPI'
    CHEQUE = 'CHEQUE', 'Cheque'
    CASH = 'CASH', 'Cash'


class RentPayment(AuditableModel):
    invoice = models.ForeignKey(
        RentInvoice,
        on_delete=models.PROTECT,
        related_name='payments'
    )
    payment_date = models.DateField(default=timezone.now)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.BANK_TRANSFER)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    hub_code_snapshot = models.CharField(max_length=20)

    class Meta:
        db_table = 'finance_rent_payments'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment of ₹{self.amount} for Invoice #{self.invoice_id}"


class HubMonthlyCost(AuditableModel):
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='monthly_costs'
    )
    period_month = models.DateField()
    electricity_bill = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    sorter_payments = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    petty_cash = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_monthly_cost = models.DecimalField(max_digits=14, decimal_places=2)
    hub_code_snapshot = models.CharField(max_length=20)

    class Meta:
        db_table = 'finance_hub_monthly_costs'
        ordering = ['-period_month']
        constraints = [
            models.UniqueConstraint(
                fields=['hub', 'period_month'],
                name='uq_finance_hub_monthly_cost'
            )
        ]

    def __str__(self):
        return f"Monthly Costs for {self.hub_code_snapshot} ({self.period_month.strftime('%b %Y')}): ₹{self.total_monthly_cost}"


class HubAnnualCost(AuditableModel):
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='annual_costs'
    )
    fy_start_year = models.IntegerField(help_text="Starting calendar year of Financial Year, e.g. 2026 for FY 2026-27")
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    hub_code_snapshot = models.CharField(max_length=20)

    class Meta:
        db_table = 'finance_hub_annual_costs'
        ordering = ['-fy_start_year']
        constraints = [
            models.UniqueConstraint(
                fields=['hub', 'fy_start_year'],
                name='uq_finance_hub_fy_cost'
            )
        ]

    def __str__(self):
        return f"FY {self.fy_start_year}-{self.fy_start_year+1} Cost for {self.hub_code_snapshot}: ₹{self.total_cost}"
