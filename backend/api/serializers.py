from rest_framework import serializers
from .models import (
    AppUser, Godown, RentEntry, Asset, Employee,
    SalaryPayment, Expense, AppSettings,
    HubBroadband, FinanceTotalRevenue, FinanceRent
)
from .crypto import encrypt_password, decrypt_password


class AppUserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    mustChangePassword = serializers.BooleanField(source='must_change_password')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AppUser
        fields = ['id', 'username', 'email', 'fullName', 'role', 'mustChangePassword', 'createdAt']


class HubBroadbandSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id', required=False)
    networkProvider = serializers.CharField(source='network_provider', required=False, allow_null=True, allow_blank=True)
    accountNumber = serializers.CharField(source='account_number', required=False, allow_null=True, allow_blank=True)
    registeredMobile = serializers.CharField(source='registered_mobile', required=False, allow_null=True, allow_blank=True)
    userId = serializers.CharField(source='user_id', required=False, allow_null=True, allow_blank=True)
    currentPlanEndDate = serializers.DateField(source='current_plan_end_date', required=False, allow_null=True)
    serviceContactNumber = serializers.CharField(source='service_contact_number', required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = HubBroadband
        fields = [
            'id', 'hubId', 'networkProvider', 'accountNumber',
            'registeredMobile', 'userId', 'currentPlanEndDate',
            'serviceContactNumber', 'createdAt'
        ]


class FinanceTotalRevenueSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    hubName = serializers.CharField(source='hub.erp_name', read_only=True)
    hubCode = serializers.CharField(source='hub.code', read_only=True)
    financialYear = serializers.CharField(source='financial_year')
    rent = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    setupCostPerMonth = serializers.DecimalField(source='setup_cost_per_month', max_digits=12, decimal_places=2, required=False, default=0)
    electricity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    wifi = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    manpower = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    housekeeping = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    wmRefreshmentPettyCash = serializers.DecimalField(source='wm_refreshment_petty_cash', max_digits=12, decimal_places=2, required=False, default=0)
    totalRevenue = serializers.DecimalField(source='total_revenue', max_digits=12, decimal_places=2, required=False, default=0)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = FinanceTotalRevenue
        fields = [
            'id', 'hubId', 'hubName', 'hubCode', 'financialYear', 'rent',
            'setupCostPerMonth', 'electricity', 'wifi', 'manpower', 'housekeeping',
            'wmRefreshmentPettyCash', 'totalRevenue', 'createdAt', 'updatedAt'
        ]


class FinanceRentSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    hubName = serializers.CharField(source='hub.erp_name', read_only=True)
    hubCode = serializers.CharField(source='hub.code', read_only=True)
    period = serializers.CharField()
    rent = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    tdsPercent = serializers.DecimalField(source='tds_percent', max_digits=5, decimal_places=2, required=False, allow_null=True, default=10)
    tdsAmount = serializers.DecimalField(source='tds_amount', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    totalRentAfterTds = serializers.DecimalField(source='total_rent_after_tds', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    gstPercent = serializers.DecimalField(source='gst_percent', max_digits=5, decimal_places=2, required=False, allow_null=True, default=18)
    gstAmount = serializers.DecimalField(source='gst_amount', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    totalRentIncludingGst = serializers.DecimalField(source='total_rent_including_gst', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    electricityBill = serializers.DecimalField(source='electricity_bill', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    wifiBill = serializers.DecimalField(source='wifi_bill', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    sorterPayments = serializers.DecimalField(source='sorter_payments', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    pettyCash = serializers.DecimalField(source='petty_cash', max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, default=0)
    tdsApplied = serializers.BooleanField(source='tds_applied', required=False, default=False)
    gstApplied = serializers.BooleanField(source='gst_applied', required=False, default=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = FinanceRent
        fields = [
            'id', 'hubId', 'hubName', 'hubCode', 'period', 'rent', 'tdsPercent', 'tdsAmount',
            'totalRentAfterTds', 'gstPercent', 'gstAmount', 'totalRentIncludingGst',
            'electricityBill', 'wifiBill', 'sorterPayments', 'pettyCash', 'total',
            'tdsApplied', 'gstApplied',
            'createdAt', 'updatedAt'
        ]


class GodownSerializer(serializers.ModelSerializer):
    erpName = serializers.CharField(source='erp_name', required=False, allow_null=True, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    locationAddress = serializers.CharField(source='location_address', required=False, allow_null=True, allow_blank=True)
    totalCapacity = serializers.DecimalField(source='total_capacity', max_digits=12, decimal_places=2, required=False, allow_null=True)
    sizeSqft = serializers.DecimalField(source='size_sqft', max_digits=12, decimal_places=2, required=False, allow_null=True)
    currentTenant = serializers.CharField(source='current_tenant', required=True)
    tenantPhone = serializers.CharField(source='tenant_phone', required=False, allow_null=True, allow_blank=True)
    tenantEmail = serializers.CharField(source='tenant_email', required=False, allow_null=True, allow_blank=True)
    leaseStartDate = serializers.DateField(source='lease_start_date', required=False, allow_null=True)
    leaseEndDate = serializers.DateField(source='lease_end_date', required=False, allow_null=True)
    leaseDurationMonths = serializers.IntegerField(source='lease_duration_months', required=False, default=0)
    monthlyRent = serializers.DecimalField(source='monthly_rent', max_digits=14, decimal_places=2, required=False, default=0)
    securityAdvance = serializers.DecimalField(source='security_advance', max_digits=14, decimal_places=2, required=False, default=0)
    refundableAdvance = serializers.DecimalField(source='refundable_advance', max_digits=14, decimal_places=2, required=False, default=0)
    
    # Hub Extended Fields
    hubPocName = serializers.CharField(source='hub_poc_name', required=False, allow_null=True, allow_blank=True)
    hubPocContact = serializers.CharField(source='hub_poc_contact', required=False, allow_null=True, allow_blank=True)
    hubModel = serializers.CharField(source='hub_model', required=False, allow_null=True, allow_blank=True)
    hubStatus = serializers.CharField(source='hub_status', required=False, allow_null=True, allow_blank=True)
    googleLocation = serializers.CharField(source='google_location', required=False, allow_null=True, allow_blank=True)
    operationsPocName = serializers.CharField(source='operations_poc_name', required=False, allow_null=True, allow_blank=True)
    operationsPocMobile = serializers.CharField(source='operations_poc_mobile', required=False, allow_null=True, allow_blank=True)
    broadbandDetails = serializers.JSONField(source='broadband_details', required=False, default=list)
    cctvUsername = serializers.CharField(source='cctv_username', required=False, allow_null=True, allow_blank=True)
    cctvPassword = serializers.SerializerMethodField()
    hasCctvPassword = serializers.SerializerMethodField()
    cctvAccessUrl = serializers.CharField(source='cctv_access_url', required=False, allow_null=True, allow_blank=True)
    hasLabourLicence = serializers.BooleanField(source='has_labour_licence', required=False, default=False)
    labourLicenceStartDate = serializers.DateField(source='labour_licence_start_date', required=False, allow_null=True)
    labourLicenceExpiryDate = serializers.DateField(source='labour_licence_expiry_date', required=False, allow_null=True)
    hasTradeLicence = serializers.BooleanField(source='has_trade_licence', required=False, default=False)
    tradeLicenceStartDate = serializers.DateField(source='trade_licence_start_date', required=False, allow_null=True)
    tradeLicenceExpiryDate = serializers.DateField(source='trade_licence_expiry_date', required=False, allow_null=True)
    totalSetupCost = serializers.DecimalField(source='total_setup_cost', max_digits=14, decimal_places=2, required=False, default=0)
    electricityProvider = serializers.CharField(source='electricity_provider', required=False, allow_null=True, allow_blank=True)
    electricityServiceNumber = serializers.CharField(source='electricity_service_number', required=False, allow_null=True, allow_blank=True)
    leaseContactName = serializers.CharField(source='lease_contact_name', required=False, allow_null=True, allow_blank=True)
    leaseContactMobile = serializers.CharField(source='lease_contact_mobile', required=False, allow_null=True, allow_blank=True)
    ownerAddress = serializers.CharField(source='owner_address', required=False, allow_null=True, allow_blank=True)
    hubDetails = serializers.JSONField(source='hub_details', required=False, default=dict)
    
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    def get_hasCctvPassword(self, obj):
        return bool(obj.cctv_password)

    def get_cctvPassword(self, obj):
        # Protected: Never broadcast plain-text password in bulk responses. Requires admin verification.
        if obj.cctv_password:
            return '••••••••••••'
        return ""

    class Meta:
        model = Godown
        fields = [
            'id', 'name', 'erpName', 'code', 'city', 'state', 'address', 'locationAddress', 'pincode',
            'totalCapacity', 'sizeSqft', 'status', 'hubStatus', 'currentTenant', 'tenantPhone', 'tenantEmail',
            'leaseStartDate', 'leaseEndDate', 'leaseDurationMonths', 'monthlyRent', 'securityAdvance', 'refundableAdvance',
            'notes', 'hubPocName', 'hubPocContact', 'hubModel', 'googleLocation',
            'operationsPocName', 'operationsPocMobile', 'broadbandDetails',
            'cctvUsername', 'cctvPassword', 'hasCctvPassword', 'cctvAccessUrl',
            'hasLabourLicence', 'labourLicenceStartDate', 'labourLicenceExpiryDate',
            'hasTradeLicence', 'tradeLicenceStartDate', 'tradeLicenceExpiryDate',
            'totalSetupCost', 'electricityProvider', 'electricityServiceNumber',
            'leaseContactName', 'leaseContactMobile', 'ownerAddress', 'hubDetails',
            'isDeleted', 'createdAt', 'updatedAt'
        ]


class RentEntrySerializer(serializers.ModelSerializer):
    godownId = serializers.IntegerField(source='godown_id')
    godownName = serializers.CharField(source='godown.name', read_only=True)
    godownCode = serializers.CharField(source='godown.code', read_only=True)
    tenantName = serializers.CharField(source='godown.current_tenant', read_only=True)
    rentMonth = serializers.CharField(source='rent_month')
    dueDate = serializers.DateField(source='due_date')
    dueAmount = serializers.DecimalField(source='due_amount', max_digits=14, decimal_places=2)
    paidAmount = serializers.DecimalField(source='paid_amount', max_digits=14, decimal_places=2, required=False)
    paymentDate = serializers.DateField(source='payment_date', required=False, allow_null=True)
    paymentMethod = serializers.CharField(source='payment_method', required=False, allow_null=True, allow_blank=True)
    transactionRef = serializers.CharField(source='transaction_ref', required=False, allow_null=True, allow_blank=True)
    receiptUrl = serializers.CharField(source='receipt_url', required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = RentEntry
        fields = [
            'id', 'godownId', 'godownName', 'godownCode', 'tenantName',
            'rentMonth', 'dueDate', 'dueAmount', 'paidAmount', 'paymentDate',
            'status', 'paymentMethod', 'transactionRef', 'receiptUrl',
            'notes', 'createdAt', 'updatedAt'
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    godownId = serializers.IntegerField(source='godown_id', required=False, allow_null=True)
    godownName = serializers.CharField(source='godown.name', read_only=True)
    godownCode = serializers.CharField(source='godown.code', read_only=True)
    billDate = serializers.DateField(source='bill_date')
    dueDate = serializers.DateField(source='due_date', required=False, allow_null=True)
    paymentDate = serializers.DateField(source='payment_date', required=False, allow_null=True)
    paymentMethod = serializers.CharField(source='payment_method', required=False, allow_null=True, allow_blank=True)
    transactionRef = serializers.CharField(source='transaction_ref', required=False, allow_null=True, allow_blank=True)
    receiptUrl = serializers.CharField(source='receipt_url', required=False, allow_null=True, allow_blank=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'godownId', 'godownName', 'godownCode', 'category', 'title',
            'amount', 'responsibility', 'status', 'billDate', 'dueDate',
            'paymentDate', 'paymentMethod', 'transactionRef', 'receiptUrl',
            'notes', 'isDeleted', 'createdAt', 'updatedAt'
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    godownId = serializers.IntegerField(source='godown_id', required=False, allow_null=True)
    godownName = serializers.CharField(source='godown.name', read_only=True)
    godownCode = serializers.CharField(source='godown.code', read_only=True)
    fullName = serializers.CharField(source='full_name')
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phoneNumber = serializers.CharField(source='phone', required=False, allow_blank=True, allow_null=True)
    monthlySalary = serializers.DecimalField(source='monthly_salary', max_digits=14, decimal_places=2, required=False, default=0)
    joiningDate = serializers.DateField(source='joining_date')
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['monthlySalary'] = float(instance.monthly_salary or 0)
        ret['phone'] = instance.phone or ''
        ret['phoneNumber'] = instance.phone or ''
        request = self.context.get('request')
        if request and request.user and getattr(request.user, 'role', '').upper() == 'VIEWER':
            ret['monthlySalary'] = None  # Sensitive salary hidden from VIEWER role
        return ret

    class Meta:
        model = Employee
        fields = [
            'id', 'godownId', 'godownName', 'godownCode', 'fullName', 'role', 'phone', 'phoneNumber', 'email',
            'monthlySalary', 'joiningDate', 'status', 'isDeleted', 'createdAt', 'updatedAt'
        ]


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employeeId = serializers.IntegerField(source='employee_id')
    employeeName = serializers.CharField(source='employee.full_name', read_only=True)
    godownName = serializers.CharField(source='employee.godown.name', read_only=True)
    godownCode = serializers.CharField(source='employee.godown.code', read_only=True)
    paymentMonth = serializers.CharField(source='payment_month')
    paymentDate = serializers.DateField(source='payment_date', required=False, allow_null=True)
    paymentMode = serializers.CharField(source='payment_mode', required=False, allow_null=True)
    transactionRef = serializers.CharField(source='transaction_ref', required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = SalaryPayment
        fields = [
            'id', 'employeeId', 'employeeName', 'godownName', 'godownCode', 'paymentMonth',
            'amount', 'paymentDate', 'status', 'paymentMode', 'transactionRef',
            'notes', 'createdAt', 'updatedAt'
        ]


class AssetSerializer(serializers.ModelSerializer):
    godownId = serializers.IntegerField(source='godown_id')
    godownName = serializers.CharField(source='godown.name', read_only=True)
    godownCode = serializers.CharField(source='godown.code', read_only=True)
    serialNumber = serializers.CharField(source='serial_number', required=False, allow_null=True, allow_blank=True)
    warrantyExpiryDate = serializers.DateField(source='warranty_expiry_date', required=False, allow_null=True)
    purchaseDate = serializers.DateField(source='purchase_date', required=False, allow_null=True)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'godownId', 'godownName', 'godownCode', 'name', 'category',
            'serialNumber', 'quantity', 'cost', 'condition', 'purchaseDate',
            'warrantyExpiryDate', 'notes', 'isDeleted', 'createdAt', 'updatedAt'
        ]


class AppSettingsSerializer(serializers.ModelSerializer):
    companyName = serializers.CharField(source='company_name')
    logoUrl = serializers.CharField(source='logo_url', required=False, allow_null=True, allow_blank=True)
    currencySymbol = serializers.CharField(source='currency_symbol', default='₹')
    contactEmail = serializers.CharField(source='contact_email', required=False, allow_null=True, allow_blank=True)
    contactPhone = serializers.CharField(source='contact_phone', required=False, allow_null=True, allow_blank=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = AppSettings
        fields = ['id', 'companyName', 'logoUrl', 'currencySymbol', 'contactEmail', 'contactPhone', 'updatedAt']

