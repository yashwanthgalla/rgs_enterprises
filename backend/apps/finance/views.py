from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import RoleBasedModelPermission
from apps.hubs.models import Hub
from apps.finance.models import (
    RentAgreement, RentInvoice, RentPayment, HubMonthlyCost, HubAnnualCost
)
from apps.finance.serializers import (
    RentAgreementSerializer, RentInvoiceSerializer, RentPaymentSerializer,
    HubMonthlyCostSerializer, HubAnnualCostSerializer
)
from apps.finance.services.tax_calculation_service import calculate_rent_invoice_taxes


class RentAgreementViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = RentAgreementSerializer

    def get_queryset(self):
        qs = RentAgreement.objects.filter(is_deleted=False)
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        return qs.order_by('-start_date')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RentInvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = RentInvoiceSerializer

    def get_queryset(self):
        qs = RentInvoice.objects.all()
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        period = self.request.query_params.get('period_month')
        if period:
            qs = qs.filter(period_month=period)
        invoice_status = self.request.query_params.get('status')
        if invoice_status:
            qs = qs.filter(status=invoice_status.upper())
        return qs.order_by('-period_month')

    def perform_create(self, serializer):
        hub_id = serializer.validated_data['hub_id']
        hub = Hub.objects.get(id=hub_id)
        base_rent = serializer.validated_data['base_rent']
        tds_app = serializer.validated_data.get('tds_applied', True)
        tds_pct = serializer.validated_data.get('tds_percent', 10.00)
        gst_app = serializer.validated_data.get('gst_applied', True)
        gst_pct = serializer.validated_data.get('gst_percent', 18.00)

        tax_res = calculate_rent_invoice_taxes(base_rent, tds_app, tds_pct, gst_app, gst_pct)
        serializer.save(
            tds_amount=tax_res['tds_amount'],
            gst_amount=tax_res['gst_amount'],
            net_payable=tax_res['net_payable'],
            hub_code_snapshot=hub.code,
            hub_name_snapshot=hub.name,
            created_by=self.request.user
        )


class RentPaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = RentPaymentSerializer

    def get_queryset(self):
        qs = RentPayment.objects.all()
        invoice_id = self.request.query_params.get('invoice_id')
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        return qs.order_by('-payment_date')

    def perform_create(self, serializer):
        invoice_id = serializer.validated_data['invoice_id']
        invoice = RentInvoice.objects.get(id=invoice_id)
        serializer.save(
            hub_code_snapshot=invoice.hub_code_snapshot,
            created_by=self.request.user
        )
        invoice.status = 'PAID'
        invoice.save(update_fields=['status'])


class HubMonthlyCostViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = HubMonthlyCostSerializer

    def get_queryset(self):
        qs = HubMonthlyCost.objects.all()
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        period = self.request.query_params.get('period_month')
        if period:
            qs = qs.filter(period_month=period)
        return qs.order_by('-period_month')

    def perform_create(self, serializer):
        hub_id = serializer.validated_data['hub_id']
        hub = Hub.objects.get(id=hub_id)
        serializer.save(
            hub_code_snapshot=hub.code,
            created_by=self.request.user
        )


class HubAnnualCostViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = HubAnnualCostSerializer

    def get_queryset(self):
        qs = HubAnnualCost.objects.all()
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        return qs.order_by('-fy_start_year')

    def perform_create(self, serializer):
        hub_id = serializer.validated_data['hub_id']
        hub = Hub.objects.get(id=hub_id)
        serializer.save(
            hub_code_snapshot=hub.code,
            created_by=self.request.user
        )
