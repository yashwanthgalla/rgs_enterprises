from rest_framework import serializers
from apps.accounts.models import UserRole
from apps.hr.models import Employee, EmployeeAssignment, SalaryPayment


class EmployeeAssignmentSerializer(serializers.ModelSerializer):
    hubCode = serializers.CharField(source='hub.code', read_only=True)
    hubName = serializers.CharField(source='hub.name', read_only=True)

    class Meta:
        model = EmployeeAssignment
        fields = ['id', 'hub', 'hubCode', 'hubName', 'assigned_from', 'assigned_to', 'is_active']
        read_only_fields = ['id']


class EmployeeSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    roleTitle = serializers.CharField(source='role_title')
    employeeCode = serializers.CharField(source='employee_code', required=False)
    monthlySalary = serializers.DecimalField(source='base_monthly_salary', max_digits=14, decimal_places=2, required=False)
    currentAssignment = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employeeCode', 'fullName', 'roleTitle', 'mobile', 'email',
            'monthlySalary', 'status', 'currentAssignment', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_currentAssignment(self, obj):
        active = obj.assignments.filter(is_active=True).first()
        return EmployeeAssignmentSerializer(active).data if active else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and getattr(request.user, 'role', None) == UserRole.VIEWER:
            # Mask sensitive salary on server side
            data['monthlySalary'] = None
        return data


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.full_name', read_only=True)
    hubCode = serializers.CharField(source='hub_code_snapshot', read_only=True)
    hubName = serializers.CharField(source='hub_name_snapshot', read_only=True)
    periodMonth = serializers.DateField(source='period_month')
    baseSalary = serializers.DecimalField(source='base_salary', max_digits=14, decimal_places=2)
    netPaid = serializers.DecimalField(source='net_paid', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = SalaryPayment
        fields = [
            'id', 'employee', 'employeeName', 'hub', 'hubCode', 'hubName',
            'periodMonth', 'baseSalary', 'deductions', 'bonus', 'netPaid',
            'payment_date', 'payment_method', 'reference_number', 'created_at'
        ]
        read_only_fields = ['id', 'netPaid', 'hubCode', 'hubName', 'created_at']

    def validate(self, attrs):
        base = attrs.get('base_salary', 0)
        ded = attrs.get('deductions', 0)
        bon = attrs.get('bonus', 0)
        attrs['net_paid'] = base - ded + bon
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and getattr(request.user, 'role', None) == UserRole.VIEWER:
            data['baseSalary'] = None
            data['deductions'] = None
            data['bonus'] = None
            data['netPaid'] = None
        return data
