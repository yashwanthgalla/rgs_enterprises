from rest_framework import serializers
from apps.finance.models import (
    RentAgreement, RentInvoice, RentPayment, HubMonthlyCost, HubAnnualCost
)
from apps.finance.services.tax_calculation_service import calculate_rent_invoice_taxes


class RentAgreementSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    monthlyRent = serializers.DecimalField(source='monthly_rent', max_digits=14, decimal_places=2)
    refundableAdvance = serializers.DecimalField(source='refundable_advance', max_digits=14, decimal_places=2, default=0.00)
    totalSetupCost = serializers.DecimalField(source='total_setup_cost', max_digits=14, decimal_places=2, default=0.00)
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    tdsPercent = serializers.DecimalField(source='tds_percent', max_digits=5, decimal_places=2, default=10.00)
    gstPercent = serializers.DecimalField(source='gst_percent', max_digits=5, decimal_places=2, default=18.00)
    escalationPercent = serializers.DecimalField(source='escalation_percent', max_digits=5, decimal_places=2, default=0.00)
    isActive = serializers.BooleanField(source='is_active', default=True)

    class Meta:
        model = RentAgreement
        fields = [
            'id', 'hubId', 'agreement_number', 'startDate', 'endDate',
            'monthlyRent', 'refundableAdvance', 'totalSetupCost',
            'tds_applied', 'tdsPercent', 'gst_applied', 'gstPercent',
            'escalationPercent', 'isActive', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class RentInvoiceSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    hubCode = serializers.CharField(source='hub_code_snapshot', read_only=True)
    hubName = serializers.CharField(source='hub_name_snapshot', read_only=True)
    agreementId = serializers.IntegerField(source='agreement_id')
    periodMonth = serializers.DateField(source='period_month')
    baseRent = serializers.DecimalField(source='base_rent', max_digits=14, decimal_places=2)
    tdsApplied = serializers.BooleanField(source='tds_applied', default=True)
    tdsPercent = serializers.DecimalField(source='tds_percent', max_digits=5, decimal_places=2, default=10.00)
    tdsAmount = serializers.DecimalField(source='tds_amount', max_digits=14, decimal_places=2, read_only=True)
    gstApplied = serializers.BooleanField(source='gst_applied', default=True)
    gstPercent = serializers.DecimalField(source='gst_percent', max_digits=5, decimal_places=2, default=18.00)
    gstAmount = serializers.DecimalField(source='gst_amount', max_digits=14, decimal_places=2, read_only=True)
    netPayable = serializers.DecimalField(source='net_payable', max_digits=14, decimal_places=2, read_only=True)
    dueDate = serializers.DateField(source='due_date')

    class Meta:
        model = RentInvoice
        fields = [
            'id', 'hubId', 'hubCode', 'hubName', 'agreementId', 'periodMonth',
            'baseRent', 'tdsApplied', 'tdsPercent', 'tdsAmount',
            'gstApplied', 'gstPercent', 'gstAmount', 'netPayable',
            'status', 'dueDate', 'created_at'
        ]
        read_only_fields = ['id', 'hubCode', 'hubName', 'tdsAmount', 'gstAmount', 'netPayable', 'created_at']


class RentPaymentSerializer(serializers.ModelSerializer):
    invoiceId = serializers.IntegerField(source='invoice_id')
    paymentDate = serializers.DateField(source='payment_date')
    paymentMethod = serializers.CharField(source='payment_method')
    referenceNumber = serializers.CharField(source='reference_number', required=False, allow_blank=True)
    hubCode = serializers.CharField(source='hub_code_snapshot', read_only=True)

    class Meta:
        model = RentPayment
        fields = [
            'id', 'invoiceId', 'hubCode', 'paymentDate', 'amount',
            'paymentMethod', 'referenceNumber', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'hubCode', 'created_at']


class HubMonthlyCostSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    hubCode = serializers.CharField(source='hub_code_snapshot', read_only=True)
    periodMonth = serializers.DateField(source='period_month')
    electricityBill = serializers.DecimalField(source='electricity_bill', max_digits=14, decimal_places=2)
    sorterPayments = serializers.DecimalField(source='sorter_payments', max_digits=14, decimal_places=2)
    pettyCash = serializers.DecimalField(source='petty_cash', max_digits=14, decimal_places=2)
    totalMonthlyCost = serializers.DecimalField(source='total_monthly_cost', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = HubMonthlyCost
        fields = [
            'id', 'hubId', 'hubCode', 'periodMonth',
            'electricityBill', 'sorterPayments', 'pettyCash',
            'totalMonthlyCost', 'created_at'
        ]
        read_only_fields = ['id', 'totalMonthlyCost', 'hubCode', 'created_at']

    def validate(self, attrs):
        elec = attrs.get('electricity_bill', 0)
        sorter = attrs.get('sorter_payments', 0)
        petty = attrs.get('petty_cash', 0)
        attrs['total_monthly_cost'] = elec + sorter + petty
        return attrs


class HubAnnualCostSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    hubCode = serializers.CharField(source='hub_code_snapshot', read_only=True)
    fyStartYear = serializers.IntegerField(source='fy_start_year')
    totalCost = serializers.DecimalField(source='total_cost', max_digits=14, decimal_places=2)

    class Meta:
        model = HubAnnualCost
        fields = ['id', 'hubId', 'hubCode', 'fyStartYear', 'totalCost', 'created_at']
        read_only_fields = ['id', 'hubCode', 'created_at']
