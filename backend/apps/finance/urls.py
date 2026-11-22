from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.finance.views import (
    RentAgreementViewSet, RentInvoiceViewSet, RentPaymentViewSet,
    HubMonthlyCostViewSet, HubAnnualCostViewSet
)

router = DefaultRouter()
router.register(r'agreements', RentAgreementViewSet, basename='rent-agreement')
router.register(r'invoices', RentInvoiceViewSet, basename='rent-invoice')
router.register(r'payments', RentPaymentViewSet, basename='rent-payment')
router.register(r'monthly-costs', HubMonthlyCostViewSet, basename='monthly-cost')
router.register(r'annual-costs', HubAnnualCostViewSet, basename='annual-cost')

urlpatterns = [
    path('', include(router.urls)),
]
