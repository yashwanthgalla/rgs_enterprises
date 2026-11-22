from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.hr.views import (
    EmployeeViewSet, EmployeeAssignmentViewSet, SalaryPaymentViewSet
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'assignments', EmployeeAssignmentViewSet, basename='employee-assignment')
router.register(r'salaries', SalaryPaymentViewSet, basename='salary-payment')

urlpatterns = [
    path('', include(router.urls)),
]
