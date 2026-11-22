from django.db import models
from django.utils import timezone
from apps.core.models import SoftDeletableModel, AuditableModel


class EmployeeStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    ON_LEAVE = 'ON_LEAVE', 'On Leave'
    TERMINATED = 'TERMINATED', 'Terminated'


class Employee(SoftDeletableModel):
    employee_code = models.CharField(max_length=30, unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    role_title = models.CharField(max_length=100)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(null=True, blank=True)
    base_monthly_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=30, choices=EmployeeStatus.choices, default=EmployeeStatus.ACTIVE)

    class Meta:
        db_table = 'hr_employees'
        ordering = ['id']

    def __str__(self):
        return f"{self.full_name} ({self.employee_code}) - {self.role_title}"


class EmployeeAssignment(AuditableModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='assignments'
    )
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='staff_assignments'
    )
    assigned_from = models.DateField(default=timezone.now)
    assigned_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'hr_employee_assignments'
        ordering = ['-assigned_from']
        constraints = [
            models.UniqueConstraint(
                fields=['employee'],
                condition=models.Q(is_active=True),
                name='uq_hr_active_employee_assignment'
            )
        ]

    def __str__(self):
        return f"{self.employee.full_name} -> {self.hub.name} (Active: {self.is_active})"


class SalaryPayment(AuditableModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='salary_payments'
    )
    hub = models.ForeignKey(
        'hubs.Hub',
        on_delete=models.PROTECT,
        related_name='salary_expenses'
    )
    period_month = models.DateField()
    base_salary = models.DecimalField(max_digits=14, decimal_places=2)
    deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    bonus = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    net_paid = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    payment_method = models.CharField(max_length=30, default='BANK_TRANSFER')
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    hub_code_snapshot = models.CharField(max_length=20)
    hub_name_snapshot = models.CharField(max_length=200)

    class Meta:
        db_table = 'hr_salary_payments'
        ordering = ['-period_month']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'period_month'],
                name='uq_hr_employee_salary_month'
            )
        ]

    def __str__(self):
        return f"Salary {self.period_month.strftime('%b %Y')} for {self.employee.full_name} (₹{self.net_paid})"
