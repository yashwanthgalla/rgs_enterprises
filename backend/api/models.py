from django.db import models
from django.utils import timezone


class AppUser(models.Model):
    id = models.BigAutoField(primary_key=True)
    username = models.CharField(unique=True, max_length=100)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=50, default='ADMIN')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)
    email = models.CharField(max_length=150, blank=True, null=True)
    must_change_password = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'auth_users'

    @property
    def is_authenticated(self):
        return getattr(self, '_is_authenticated', True)

    @is_authenticated.setter
    def is_authenticated(self, value):
        self._is_authenticated = bool(value)

    def __str__(self):
        return f"{self.full_name} ({self.username})"


class Godown(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=200)
    erp_name = models.CharField(max_length=255, blank=True, null=True)
    code = models.CharField(unique=True, max_length=50)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    address = models.TextField()
    location_address = models.TextField(blank=True, null=True)
    pincode = models.CharField(max_length=20, blank=True, null=True)
    size_sqft = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_capacity = models.DecimalField(max_digits=12, decimal_places=2, default=0, blank=True, null=True)
    status = models.CharField(max_length=50, default='ACTIVE')
    hub_status = models.CharField(max_length=50, default='ACTIVE', blank=True, null=True)
    current_tenant = models.CharField(max_length=200, blank=True, null=True)
    tenant_phone = models.CharField(max_length=50, blank=True, null=True)
    tenant_email = models.CharField(max_length=100, blank=True, null=True)
    lease_start_date = models.DateField(blank=True, null=True)
    lease_end_date = models.DateField(blank=True, null=True)
    lease_duration_months = models.IntegerField(default=0, blank=True, null=True)
    monthly_rent = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    security_advance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    refundable_advance = models.DecimalField(max_digits=14, decimal_places=2, default=0, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    hub_poc_name = models.CharField(max_length=200, blank=True, null=True)
    hub_poc_contact = models.CharField(max_length=50, blank=True, null=True)
    hub_model = models.CharField(max_length=50, blank=True, null=True)
    google_location = models.TextField(blank=True, null=True)
    operations_poc_name = models.CharField(max_length=200, blank=True, null=True)
    operations_poc_mobile = models.CharField(max_length=50, blank=True, null=True)
    ops_poc_name = models.CharField(max_length=200, blank=True, null=True)
    ops_poc_mobile = models.CharField(max_length=50, blank=True, null=True)
    broadband_details = models.JSONField(default=list, blank=True, null=True)
    cctv_username = models.CharField(max_length=100, blank=True, null=True)
    cctv_password = models.CharField(max_length=255, blank=True, null=True)
    cctv_access_url = models.TextField(blank=True, null=True)
    has_labour_licence = models.BooleanField(default=False)
    labour_licence_available = models.BooleanField(default=False)
    labour_licence_start_date = models.DateField(blank=True, null=True)
    labour_licence_start = models.DateField(blank=True, null=True)
    labour_licence_expiry_date = models.DateField(blank=True, null=True)
    labour_licence_expiry = models.DateField(blank=True, null=True)
    has_trade_licence = models.BooleanField(default=False)
    trade_licence_available = models.BooleanField(default=False)
    trade_licence_start_date = models.DateField(blank=True, null=True)
    trade_licence_start = models.DateField(blank=True, null=True)
    trade_licence_expiry_date = models.DateField(blank=True, null=True)
    trade_licence_expiry = models.DateField(blank=True, null=True)
    total_setup_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    electricity_provider = models.CharField(max_length=200, blank=True, null=True)
    electricity_service_provider = models.CharField(max_length=200, blank=True, null=True)
    electricity_service_number = models.CharField(max_length=100, blank=True, null=True)
    lease_contact_name = models.CharField(max_length=200, blank=True, null=True)
    lease_contact_mobile = models.CharField(max_length=50, blank=True, null=True)
    owner_address = models.TextField(blank=True, null=True)
    hub_details = models.JSONField(default=dict, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hubs'

    def __str__(self):
        return f"{self.erp_name or self.name} ({self.code})"


class HubBroadband(models.Model):
    id = models.BigAutoField(primary_key=True)
    hub = models.ForeignKey(Godown, on_delete=models.CASCADE, related_name='broadband_rows', db_column='hub_id')
    network_provider = models.CharField(max_length=255, blank=True, null=True)
    account_number = models.CharField(max_length=100, blank=True, null=True)
    registered_mobile = models.CharField(max_length=20, blank=True, null=True)
    user_id = models.CharField(max_length=100, blank=True, null=True)
    current_plan_end_date = models.DateField(blank=True, null=True)
    service_contact_number = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_broadband'

    def __str__(self):
        return f"{self.network_provider} ({self.hub.name})"


class FinanceTotalRevenue(models.Model):
    id = models.BigAutoField(primary_key=True)
    hub = models.ForeignKey(Godown, on_delete=models.CASCADE, related_name='total_revenues', db_column='hub_id')
    financial_year = models.CharField(max_length=20)
    rent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    setup_cost_per_month = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    electricity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wifi = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manpower = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    housekeeping = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wm_refreshment_petty_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_yearly_revenues'
        unique_together = (('hub', 'financial_year'),)

    def __str__(self):
        return f"{self.hub.name} - FY {self.financial_year}"


class FinanceRent(models.Model):
    id = models.BigAutoField(primary_key=True)
    hub = models.ForeignKey(Godown, on_delete=models.CASCADE, related_name='finance_rents', db_column='hub_id')
    period = models.CharField(max_length=50)  # e.g. "2026-03" or "March 2026"
    rent = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    tds_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10, null=True, blank=True)
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    total_rent_after_tds = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18, null=True, blank=True)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    total_rent_including_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    electricity_bill = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    wifi_bill = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    sorter_payments = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    petty_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    tds_applied = models.BooleanField(default=False)
    gst_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_monthly_rents'
        unique_together = (('hub', 'period'),)

    def __str__(self):
        return f"{self.hub.name} - Rent {self.period}"


class RentEntry(models.Model):
    id = models.BigAutoField(primary_key=True)
    godown = models.ForeignKey(Godown, on_delete=models.CASCADE, related_name='rent_entries', db_column='hub_id')
    rent_month = models.CharField(max_length=7)
    due_date = models.DateField()
    due_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='DUE')
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    receipt_url = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_rent_entries'
        unique_together = (('godown', 'rent_month'),)

    def __str__(self):
        return f"Rent {self.rent_month} - {self.godown.name}"


class Asset(models.Model):
    id = models.BigAutoField(primary_key=True)
    godown = models.ForeignKey(Godown, on_delete=models.SET_NULL, null=True, blank=True, related_name='assets', db_column='hub_id')
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.IntegerField(default=1)
    cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    condition = models.CharField(max_length=50, default='GOOD')
    purchase_date = models.DateField(blank=True, null=True)
    warranty_expiry_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_assets'

    def __str__(self):
        return f"{self.name} ({self.category})"


class Employee(models.Model):
    id = models.BigAutoField(primary_key=True)
    godown = models.ForeignKey(Godown, on_delete=models.SET_NULL, blank=True, null=True, related_name='employees', db_column='hub_id')
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=100)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.CharField(max_length=100, blank=True, null=True)
    monthly_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    joining_date = models.DateField()
    status = models.CharField(max_length=50, default='ACTIVE')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_staff'

    def __str__(self):
        return f"{self.full_name} - {self.role}"


class SalaryPayment(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.DO_NOTHING, related_name='salary_payments')
    payment_month = models.CharField(max_length=7)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, default='PAID')
    payment_mode = models.CharField(max_length=50, blank=True, null=True)
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_staff'
        unique_together = (('employee', 'payment_month'),)

    def __str__(self):
        return f"{self.employee.full_name} - {self.payment_month}"


class Expense(models.Model):
    id = models.BigAutoField(primary_key=True)
    godown = models.ForeignKey(Godown, on_delete=models.CASCADE, related_name='expenses', db_column='hub_id')
    category = models.CharField(max_length=100)
    title = models.CharField(max_length=250)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    responsibility = models.CharField(max_length=50, default='COMPANY')
    status = models.CharField(max_length=50, default='PENDING')
    bill_date = models.DateField()
    due_date = models.DateField(blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    receipt_url = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'hub_bills'

    def __str__(self):
        return f"{self.title} - INR {self.amount}"


class AppSettings(models.Model):
    id = models.BigAutoField(primary_key=True)
    company_name = models.CharField(max_length=200, default='RGS ENTERPRISES')
    logo_url = models.TextField(blank=True, null=True)
    currency_symbol = models.CharField(max_length=10, default='₹')
    contact_email = models.CharField(max_length=100, blank=True, null=True, default='rgsenterprise2026@gmail.com')
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = False
        db_table = 'app_settings'
