from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import RoleBasedModelPermission
from apps.hr.models import Employee, EmployeeAssignment, SalaryPayment
from apps.hr.serializers import (
    EmployeeSerializer, EmployeeAssignmentSerializer, SalaryPaymentSerializer
)


class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        qs = Employee.objects.filter(is_deleted=False).prefetch_related('assignments')
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(assignments__hub_id=hub_id, assignments__is_active=True)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(full_name__icontains=search.strip())
        return qs.order_by('id')

    def perform_create(self, serializer):
        # Auto-generate employee code if missing
        count = Employee.objects.count() + 1
        emp_code = f"EMP#{count:03d}"
        serializer.save(
            employee_code=serializer.validated_data.get('employee_code') or emp_code,
            created_by=self.request.user
        )


class EmployeeAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = EmployeeAssignmentSerializer

    def get_queryset(self):
        qs = EmployeeAssignment.objects.all()
        emp_id = self.request.query_params.get('employee_id')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        return qs.order_by('-assigned_from')

    def perform_create(self, serializer):
        # Deactivate previous active assignments for this employee
        emp = serializer.validated_data['employee']
        EmployeeAssignment.objects.filter(employee=emp, is_active=True).update(is_active=False)
        serializer.save(is_active=True, created_by=self.request.user)


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = SalaryPaymentSerializer

    def get_queryset(self):
        qs = SalaryPayment.objects.select_related('employee', 'hub')
        emp_id = self.request.query_params.get('employee_id')
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        period = self.request.query_params.get('period_month')
        if period:
            qs = qs.filter(period_month=period)
        return qs.order_by('-period_month')

    def perform_create(self, serializer):
        hub = serializer.validated_data['hub']
        serializer.save(
            hub_code_snapshot=hub.code,
            hub_name_snapshot=hub.name,
            created_by=self.request.user
        )
