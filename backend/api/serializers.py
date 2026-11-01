from rest_framework import serializers
from .models import (
    AppUser, Godown, RentEntry, Asset, Employee,
    SalaryPayment, Expense, Document, ActivityLog, AppSettings
)


class AppUserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    mustChangePassword = serializers.BooleanField(source='must_change_password')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = AppUser
        fields = ['id', 'username', 'email', 'fullName', 'role', 'mustChangePassword', 'createdAt']


class GodownSerializer(serializers.ModelSerializer):
    sizeSqft = serializers.DecimalField(source='size_sqft', max_digits=12, decimal_places=2, required=False)
    currentTenant = serializers.CharField(source='current_tenant', required=False, allow_null=True, allow_blank=True)
    tenantPhone = serializers.CharField(source='tenant_phone', required=False, allow_null=True, allow_blank=True)
    tenantEmail = serializers.CharField(source='tenant_email', required=False, allow_null=True, allow_blank=True)
    leaseStartDate = serializers.DateField(source='lease_start_date', required=False, allow_null=True)
    leaseEndDate = serializers.DateField(source='lease_end_date', required=False, allow_null=True)
    monthlyRent = serializers.DecimalField(source='monthly_rent', max_digits=14, decimal_places=2, required=False)
    securityAdvance = serializers.DecimalField(source='security_advance', max_digits=14, decimal_places=2, required=False)
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Godown
        fields = [
            'id', 'name', 'code', 'city', 'state', 'address', 'pincode',
            'sizeSqft', 'status', 'currentTenant', 'tenantPhone', 'tenantEmail',
            'leaseStartDate', 'leaseEndDate', 'monthlyRent', 'securityAdvance',
            'notes', 'isDeleted', 'createdAt', 'updatedAt'
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
    fullName = serializers.CharField(source='full_name')
    monthlySalary = serializers.DecimalField(source='monthly_salary', max_digits=14, decimal_places=2)
    joiningDate = serializers.DateField(source='joining_date')
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'godownId', 'godownName', 'fullName', 'role', 'phone', 'email',
            'monthlySalary', 'joiningDate', 'status', 'isDeleted', 'createdAt', 'updatedAt'
        ]


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employeeId = serializers.IntegerField(source='employee_id')
    employeeName = serializers.CharField(source='employee.full_name', read_only=True)
    godownName = serializers.CharField(source='employee.godown.name', read_only=True)
    paymentMonth = serializers.CharField(source='payment_month')
    paymentDate = serializers.DateField(source='payment_date', required=False, allow_null=True)
    paymentMode = serializers.CharField(source='payment_mode', required=False, allow_null=True)
    transactionRef = serializers.CharField(source='transaction_ref', required=False, allow_null=True, allow_blank=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = SalaryPayment
        fields = [
            'id', 'employeeId', 'employeeName', 'godownName', 'paymentMonth',
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


class DocumentSerializer(serializers.ModelSerializer):
    godownId = serializers.IntegerField(source='godown_id', required=False, allow_null=True)
    godownName = serializers.CharField(source='godown.name', read_only=True)
    fileName = serializers.CharField(source='file_name')
    fileType = serializers.CharField(source='file_type')
    fileSize = serializers.IntegerField(source='file_size')
    storagePath = serializers.CharField(source='storage_path')
    publicUrl = serializers.CharField(source='public_url')
    documentType = serializers.CharField(source='document_type')
    isDeleted = serializers.BooleanField(source='is_deleted', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'godownId', 'godownName', 'fileName', 'fileType', 'fileSize',
            'storagePath', 'publicUrl', 'documentType', 'description',
            'isDeleted', 'createdAt', 'updatedAt'
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

