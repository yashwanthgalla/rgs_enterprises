import csv
import datetime
import io
import os
import bcrypt
import jwt
from decimal import Decimal
from django.conf import settings
from django.db.models import Sum, Q, Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    AppUser, Godown, RentEntry, Expense, Employee,
    SalaryPayment, Asset, Document, AppSettings, ActivityLog
)
from .serializers import (
    AppUserSerializer, GodownSerializer, RentEntrySerializer,
    ExpenseSerializer, EmployeeSerializer, SalaryPaymentSerializer,
    AssetSerializer, DocumentSerializer, AppSettingsSerializer
)


def api_success(data=None, message="Success", status_code=status.HTTP_200_OK):
    return Response({
        "success": True,
        "message": message,
        "data": data
    }, status=status_code)


def api_error(message="An error occurred", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({
        "success": False,
        "message": message,
        "errors": errors or {}
    }, status=status_code)


def generate_jwt_token(user):
    expiration = timezone.now() + datetime.timedelta(milliseconds=settings.JWT_EXPIRATION_MS)
    payload = {
        'sub': user.username,
        'id': user.id,
        'role': user.role,
        'exp': int(expiration.timestamp()),
        'iat': int(timezone.now().timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')


# ============================================================================
# HEALTH CHECK
# ============================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "UP", "timestamp": timezone.now().isoformat()})


# ============================================================================
# AUTHENTICATION
# ============================================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return api_error("Username and password are required")

    try:
        user = AppUser.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()
        if not user:
            return api_error("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)

        # Check BCrypt password
        pwd_bytes = password.encode('utf-8')
        hash_bytes = user.password_hash.encode('utf-8')
        if not bcrypt.checkpw(pwd_bytes, hash_bytes):
            return api_error("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)

        token = generate_jwt_token(user)
        user_data = AppUserSerializer(user).data

        return api_success({
            "token": token,
            "tokenType": "Bearer",
            "expiresIn": settings.JWT_EXPIRATION_MS,
            "mustChangePassword": user.must_change_password,
            "user": user_data
        })
    except Exception as e:
        return api_error(f"Login failed: {str(e)}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return api_success(AppUserSerializer(request.user).data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    user = request.user
    data = request.data

    full_name = data.get('fullName') or data.get('newFullName')
    username = data.get('username') or data.get('newUsername')
    email = data.get('email') or data.get('newEmail')
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if full_name:
        user.full_name = full_name.strip()
    if username:
        user.username = username.strip()
    if email:
        user.email = email.strip()

    if new_password:
        if not current_password:
            return api_error("Current password is required to set a new password")
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return api_error("Current password is incorrect")
        
        salt = bcrypt.gensalt(10)
        user.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
        user.must_change_password = False

    user.save()
    new_token = generate_jwt_token(user)

    return api_success({
        "token": new_token,
        "tokenType": "Bearer",
        "expiresIn": settings.JWT_EXPIRATION_MS,
        "mustChangePassword": user.must_change_password,
        "user": AppUserSerializer(user).data
    })


# ============================================================================
# DASHBOARD
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats_view(request):
    godowns = Godown.objects.filter(is_deleted=False)
    total_godowns = godowns.count()
    active_godowns = godowns.filter(status='ACTIVE').count()

    total_capacity = godowns.aggregate(total=Sum('size_sqft'))['total'] or Decimal('0')
    occupied_godowns = godowns.filter(current_tenant__isnull=False).exclude(current_tenant='')
    occupied_capacity = occupied_godowns.aggregate(total=Sum('size_sqft'))['total'] or Decimal('0')
    occupancy_rate = (occupied_capacity / total_capacity * 100) if total_capacity > 0 else Decimal('0')

    now = timezone.now()
    current_month_str = now.strftime('%Y-%m')

    # Expected rent from active godowns
    monthly_rent_expected = godowns.filter(status='ACTIVE').aggregate(total=Sum('monthly_rent'))['total'] or Decimal('0')

    # Current month rent entries
    current_rents = RentEntry.objects.filter(rent_month=current_month_str)
    monthly_rent_collected = current_rents.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')

    # Overdue/Pending rent
    pending_rent = RentEntry.objects.filter(
        Q(status__in=['DUE', 'PARTIAL', 'OVERDUE'])
    ).aggregate(
        total=Sum('due_amount') - Sum('paid_amount')
    )['total'] or Decimal('0')

    # Current month expenses
    current_expenses = Expense.objects.filter(
        is_deleted=False,
        bill_date__startswith=current_month_str
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    total_staff = Employee.objects.filter(is_deleted=False, status='ACTIVE').count()
    total_assets = Asset.objects.filter(is_deleted=False).count()

    return api_success({
        "totalGodowns": total_godowns,
        "activeGodowns": active_godowns,
        "totalCapacitySqFt": float(total_capacity),
        "occupiedSqFt": float(occupied_capacity),
        "occupancyPercentage": round(float(occupancy_rate), 1),
        "occupancyRate": round(float(occupancy_rate), 1),
        "monthlyRentExpected": float(monthly_rent_expected),
        "monthlyRentCollected": float(monthly_rent_collected),
        "pendingRent": float(pending_rent),
        "monthlyExpenses": float(current_expenses),
        "netIncome": float(monthly_rent_collected - current_expenses),
        "totalStaff": total_staff,
        "totalAssets": total_assets
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_reminders_view(request):
    reminders = []
    today = timezone.now().date()

    # Overdue or pending rents
    overdue_rents = RentEntry.objects.filter(
        Q(status__in=['DUE', 'PARTIAL', 'OVERDUE']) & Q(due_date__lte=today)
    ).select_related('godown')[:10]

    for rent in overdue_rents:
        reminders.append({
            "id": f"rent-{rent.id}",
            "type": "RENT",
            "title": f"Rent Due: {rent.godown.name if rent.godown else 'Godown'}",
            "amount": float(rent.due_amount - rent.paid_amount),
            "dueDate": rent.due_date.isoformat(),
            "status": rent.status,
            "tenantName": rent.godown.current_tenant if rent.godown else "Tenant"
        })

    # Pending expenses
    pending_expenses = Expense.objects.filter(
        is_deleted=False,
        status='PENDING'
    ).select_related('godown')[:10]

    for exp in pending_expenses:
        reminders.append({
            "id": f"exp-{exp.id}",
            "type": "EXPENSE",
            "title": f"Bill Pending: {exp.title}",
            "amount": float(exp.amount),
            "dueDate": exp.due_date.isoformat() if exp.due_date else exp.bill_date.isoformat(),
            "status": exp.status,
            "category": exp.category
        })

    return api_success(reminders)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_cashflow_trend_view(request):
    months_count = int(request.GET.get('months', 6))
    today = timezone.now().date()
    trends = []

    for i in range(months_count - 1, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1

        month_str = f"{year:04d}-{month:02d}"
        month_label = datetime.date(year, month, 1).strftime('%b %Y')

        revenue = RentEntry.objects.filter(
            rent_month=month_str
        ).aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')

        expense = Expense.objects.filter(
            is_deleted=False,
            bill_date__startswith=month_str
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        salary = SalaryPayment.objects.filter(
            payment_month=month_str,
            status='PAID'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_expenses = expense + salary
        trends.append({
            "month": month_str,
            "monthLabel": month_label,
            "revenue": float(revenue),
            "expenses": float(total_expenses),
            "netProfit": float(revenue - total_expenses)
        })

    return api_success(trends)


# ============================================================================
# GODOWNS
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def godowns_view(request):
    if request.method == 'GET':
        page = int(request.GET.get('page', 0))
        size = int(request.GET.get('size', 50))
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', '').strip()

        qs = Godown.objects.filter(is_deleted=False)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search) | Q(city__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)

        total_count = qs.count()
        start = page * size
        end = start + size
        godowns = qs.order_by('id')[start:end]

        data = GodownSerializer(godowns, many=True).data
        return api_success({
            "content": data,
            "totalElements": total_count,
            "totalPages": (total_count + size - 1) // size if size > 0 else 1,
            "number": page,
            "size": size
        })

    elif request.method == 'POST':
        serializer = GodownSerializer(data=request.data)
        if serializer.is_valid():
            godown = serializer.save()
            if godown.current_tenant and godown.monthly_rent and godown.monthly_rent > 0:
                current_month = timezone.now().strftime('%Y-%m')
                due_date = timezone.now().date().replace(day=5)
                RentEntry.objects.get_or_create(
                    godown=godown,
                    rent_month=current_month,
                    defaults={
                        'due_date': due_date,
                        'due_amount': godown.monthly_rent,
                        'paid_amount': Decimal('0'),
                        'status': 'DUE',
                        'notes': f"Initial rent cycle automatically generated for {godown.name}"
                    }
                )
            return api_success(GodownSerializer(godown).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def godowns_all_view(request):
    godowns = Godown.objects.filter(is_deleted=False).order_by('name')
    return api_success(GodownSerializer(godowns, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def godowns_cities_view(request):
    cities = Godown.objects.filter(is_deleted=False).values_list('city', flat=True).distinct()
    return api_success(sorted(list(set(filter(None, cities)))))


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def godown_detail_view(request, pk):
    try:
        godown = Godown.objects.get(pk=pk, is_deleted=False)
    except Godown.DoesNotExist:
        return api_error("Godown not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(GodownSerializer(godown).data)

    elif request.method == 'PUT':
        serializer = GodownSerializer(godown, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return api_success(GodownSerializer(updated).data)
        return api_error("Validation error", errors=serializer.errors)

    elif request.method == 'DELETE':
        godown.is_deleted = True
        godown.save()
        return api_success({"message": "Godown deleted successfully"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def godown_summary_view(request, pk):
    try:
        godown = Godown.objects.get(pk=pk, is_deleted=False)
    except Godown.DoesNotExist:
        return api_error("Godown not found", status_code=status.HTTP_404_NOT_FOUND)

    rents = RentEntry.objects.filter(godown=godown)
    total_rent_collected = rents.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')
    total_rent_due = rents.aggregate(total=Sum('due_amount'))['total'] or Decimal('0')
    total_expenses = Expense.objects.filter(godown=godown, is_deleted=False).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    return api_success({
        "godown": GodownSerializer(godown).data,
        "totalRentCollected": float(total_rent_collected),
        "totalRentDue": float(total_rent_due),
        "totalExpenses": float(total_expenses),
        "netIncome": float(total_rent_collected - total_expenses)
    })


# ============================================================================
# RENT ENTRIES
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def rent_entries_view(request):
    if request.method == 'GET':
        godown_id = request.GET.get('godownId')
        rent_month = request.GET.get('month') or request.GET.get('rentMonth')
        rent_status = request.GET.get('status')

        qs = RentEntry.objects.select_related('godown')
        if godown_id:
            qs = qs.filter(godown_id=godown_id)
        if rent_month:
            qs = qs.filter(rent_month=rent_month)
        if rent_status:
            qs = qs.filter(status=rent_status)

        entries = qs.order_by('-due_date')
        return api_success(RentEntrySerializer(entries, many=True).data)

    elif request.method == 'POST':
        serializer = RentEntrySerializer(data=request.data)
        if serializer.is_valid():
            entry = serializer.save()
            return api_success(RentEntrySerializer(entry).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rent_entries_by_godown_view(request, godown_id):
    entries = RentEntry.objects.filter(godown_id=godown_id).select_related('godown').order_by('-due_date')
    return api_success(RentEntrySerializer(entries, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rent_entry_detail_view(request, pk):
    try:
        entry = RentEntry.objects.select_related('godown').get(pk=pk)
        return api_success(RentEntrySerializer(entry).data)
    except RentEntry.DoesNotExist:
        return api_error("Rent entry not found", status_code=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_rent_payment_view(request, pk):
    try:
        entry = RentEntry.objects.get(pk=pk)
    except RentEntry.DoesNotExist:
        return api_error("Rent entry not found", status_code=status.HTTP_404_NOT_FOUND)

    data = request.data
    paid_amount = Decimal(str(data.get('paidAmount') or data.get('amountPaid') or entry.due_amount))
    entry.paid_amount = paid_amount
    entry.payment_date = data.get('paymentDate') or timezone.now().date()
    entry.payment_method = data.get('paymentMethod', 'UPI')
    entry.transaction_ref = data.get('transactionRef') or data.get('referenceNumber')
    if data.get('notes'):
        entry.notes = data.get('notes')

    if entry.paid_amount >= entry.due_amount:
        entry.status = 'PAID'
    elif entry.paid_amount > 0:
        entry.status = 'PARTIAL'
    else:
        entry.status = 'DUE'

    entry.save()
    return api_success(RentEntrySerializer(entry).data)


# ============================================================================
# EXPENSES
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def expenses_view(request):
    if request.method == 'GET':
        godown_id = request.GET.get('godownId')
        category = request.GET.get('category')
        exp_status = request.GET.get('status')

        qs = Expense.objects.filter(is_deleted=False).select_related('godown')
        if godown_id:
            qs = qs.filter(godown_id=godown_id)
        if category:
            qs = qs.filter(category=category)
        if exp_status:
            qs = qs.filter(status=exp_status)

        expenses = qs.order_by('-bill_date')
        return api_success(ExpenseSerializer(expenses, many=True).data)

    elif request.method == 'POST':
        serializer = ExpenseSerializer(data=request.data)
        if serializer.is_valid():
            expense = serializer.save()
            return api_success(ExpenseSerializer(expense).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expenses_by_godown_view(request, godown_id):
    expenses = Expense.objects.filter(godown_id=godown_id, is_deleted=False).select_related('godown').order_by('-bill_date')
    return api_success(ExpenseSerializer(expenses, many=True).data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def expense_detail_view(request, pk):
    try:
        expense = Expense.objects.get(pk=pk, is_deleted=False)
    except Expense.DoesNotExist:
        return api_error("Expense not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(ExpenseSerializer(expense).data)
    elif request.method == 'DELETE':
        expense.is_deleted = True
        expense.save()
        return api_success({"message": "Expense deleted successfully"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_expense_payment_view(request, pk):
    try:
        expense = Expense.objects.get(pk=pk, is_deleted=False)
    except Expense.DoesNotExist:
        return api_error("Expense not found", status_code=status.HTTP_404_NOT_FOUND)

    data = request.data
    expense.status = 'PAID'
    expense.payment_date = data.get('paymentDate') or timezone.now().date()
    expense.payment_method = data.get('paymentMethod', 'BANK_TRANSFER')
    expense.transaction_ref = data.get('transactionRef')
    if data.get('notes'):
        expense.notes = data.get('notes')

    expense.save()
    return api_success(ExpenseSerializer(expense).data)


# ============================================================================
# EMPLOYEES & SALARIES
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employees_view(request):
    if request.method == 'GET':
        godown_id = request.GET.get('godownId')
        emp_status = request.GET.get('status')

        qs = Employee.objects.filter(is_deleted=False).select_related('godown')
        if godown_id:
            qs = qs.filter(godown_id=godown_id)
        if emp_status:
            qs = qs.filter(status=emp_status)

        employees = qs.order_by('full_name')
        return api_success(EmployeeSerializer(employees, many=True).data)

    elif request.method == 'POST':
        serializer = EmployeeSerializer(data=request.data)
        if serializer.is_valid():
            emp = serializer.save()
            return api_success(EmployeeSerializer(emp).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail_view(request, pk):
    try:
        emp = Employee.objects.get(pk=pk, is_deleted=False)
    except Employee.DoesNotExist:
        return api_error("Employee not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(EmployeeSerializer(emp).data)
    elif request.method == 'DELETE':
        emp.is_deleted = True
        emp.save()
        return api_success({"message": "Employee removed successfully"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_godown_view(request, godown_id):
    employees = Employee.objects.filter(godown_id=godown_id, is_deleted=False).select_related('godown')
    return api_success(EmployeeSerializer(employees, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def salary_payments_view(request):
    if request.method == 'GET':
        employee_id = request.GET.get('employeeId')
        month = request.GET.get('month')

        qs = SalaryPayment.objects.select_related('employee', 'employee__godown')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if month:
            qs = qs.filter(payment_month=month)

        payments = qs.order_by('-created_at')
        return api_success(SalaryPaymentSerializer(payments, many=True).data)

    elif request.method == 'POST':
        serializer = SalaryPaymentSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save()
            return api_success(SalaryPaymentSerializer(payment).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def salary_payments_by_employee_view(request, employee_id):
    payments = SalaryPayment.objects.filter(employee_id=employee_id).select_related('employee').order_by('-created_at')
    return api_success(SalaryPaymentSerializer(payments, many=True).data)


# ============================================================================
# ASSETS
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def assets_view(request):
    if request.method == 'GET':
        godown_id = request.GET.get('godownId')
        category = request.GET.get('category')

        qs = Asset.objects.filter(is_deleted=False).select_related('godown')
        if godown_id:
            qs = qs.filter(godown_id=godown_id)
        if category:
            qs = qs.filter(category=category)

        assets = qs.order_by('name')
        return api_success(AssetSerializer(assets, many=True).data)

    elif request.method == 'POST':
        serializer = AssetSerializer(data=request.data)
        if serializer.is_valid():
            asset = serializer.save()
            return api_success(AssetSerializer(asset).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def asset_detail_view(request, pk):
    try:
        asset = Asset.objects.get(pk=pk, is_deleted=False)
    except Asset.DoesNotExist:
        return api_error("Asset not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(AssetSerializer(asset).data)
    elif request.method == 'DELETE':
        asset.is_deleted = True
        asset.save()
        return api_success({"message": "Asset deleted successfully"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def assets_by_godown_view(request, godown_id):
    assets = Asset.objects.filter(godown_id=godown_id, is_deleted=False).select_related('godown')
    return api_success(AssetSerializer(assets, many=True).data)


# ============================================================================
# DOCUMENTS
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_view(request):
    godown_id = request.GET.get('godownId')
    qs = Document.objects.filter(is_deleted=False).select_related('godown')
    if godown_id:
        qs = qs.filter(godown_id=godown_id)
    return api_success(DocumentSerializer(qs.order_by('-created_at'), many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_by_godown_view(request, godown_id):
    docs = Document.objects.filter(godown_id=godown_id, is_deleted=False).select_related('godown')
    return api_success(DocumentSerializer(docs, many=True).data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def document_detail_view(request, pk):
    try:
        doc = Document.objects.get(pk=pk, is_deleted=False)
    except Document.DoesNotExist:
        return api_error("Document not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(DocumentSerializer(doc).data)
    elif request.method == 'DELETE':
        doc.is_deleted = True
        doc.save()
        return api_success({"message": "Document deleted successfully"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document_view(request):
    file_obj = request.FILES.get('file')
    if not file_obj:
        return api_error("File is required")

    godown_id = request.data.get('godownId')
    document_type = request.data.get('documentType', 'OTHER')
    description = request.data.get('description', '')

    file_name = file_obj.name
    file_type = file_obj.content_type or 'application/octet-stream'
    file_size = file_obj.size
    storage_path = f"documents/{timezone.now().strftime('%Y%m%d%H%M%S')}_{file_name}"
    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.STORAGE_BUCKET}/{storage_path}"

    doc = Document.objects.create(
        godown_id=godown_id if godown_id else None,
        file_name=file_name,
        file_type=file_type,
        file_size=file_size,
        storage_path=storage_path,
        public_url=public_url,
        document_type=document_type,
        description=description,
        is_deleted=False
    )
    return api_success(DocumentSerializer(doc).data, status_code=status.HTTP_201_CREATED)


# ============================================================================
# REPORTS
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_summary_view(request):
    year_param = request.GET.get('year')
    current_year = int(year_param) if year_param else timezone.now().year
    year_str = f"{current_year:04d}"

    # Year-wide totals
    year_rents = RentEntry.objects.filter(
        Q(rent_month__startswith=year_str) | Q(due_date__year=current_year) | Q(payment_date__year=current_year)
    )
    total_rent_billed = year_rents.aggregate(total=Sum('due_amount'))['total'] or Decimal('0')
    total_rent_collected = year_rents.aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')
    total_rent_outstanding = max(Decimal('0'), total_rent_billed - total_rent_collected)

    year_expenses = Expense.objects.filter(
        is_deleted=False,
        bill_date__year=current_year
    )
    total_company_expenses = year_expenses.filter(responsibility='COMPANY').aggregate(total=Sum('amount'))['total'] or Decimal('0')
    total_tenant_expenses = year_expenses.filter(responsibility='TENANT').aggregate(total=Sum('amount'))['total'] or Decimal('0')
    all_expenses_sum = year_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
    if total_company_expenses == 0 and all_expenses_sum > 0:
        total_company_expenses = all_expenses_sum

    year_salaries = SalaryPayment.objects.filter(
        Q(payment_month__startswith=year_str) | Q(payment_date__year=current_year),
        status='PAID'
    )
    total_salaries_paid = year_salaries.aggregate(total=Sum('amount'))['total'] or Decimal('0')

    total_operating_expenses = total_company_expenses + total_salaries_paid
    effective_income = total_rent_collected if total_rent_collected > 0 else total_rent_billed
    net_operating_income = effective_income - total_operating_expenses

    # Categories breakdown
    cat_qs = year_expenses.values('category').annotate(total=Sum('amount'))
    expenses_by_category = {item['category']: float(item['total']) for item in cat_qs}

    # Aggregate by month for the year
    monthly_data = []
    for month_num in range(1, 13):
        month_str = f"{current_year:04d}-{month_num:02d}"
        month_label = datetime.date(current_year, month_num, 1).strftime('%B')

        rev = RentEntry.objects.filter(
            Q(rent_month=month_str) | Q(payment_date__year=current_year, payment_date__month=month_num)
        ).aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')

        billed = RentEntry.objects.filter(
            Q(rent_month=month_str) | Q(due_date__year=current_year, due_date__month=month_num)
        ).aggregate(total=Sum('due_amount'))['total'] or Decimal('0')

        month_rev = rev if rev > 0 else billed

        exp = Expense.objects.filter(
            is_deleted=False,
            bill_date__year=current_year,
            bill_date__month=month_num
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        sal = SalaryPayment.objects.filter(
            Q(payment_month=month_str) | Q(payment_date__year=current_year, payment_date__month=month_num),
            status='PAID'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        month_expense = exp + sal
        net = month_rev - month_expense

        monthly_data.append({
            "month": month_str,
            "monthName": month_label,
            "revenue": float(month_rev),
            "expenses": float(month_expense),
            "netProfit": float(net)
        })

    return api_success({
        "year": current_year,
        "startDate": f"{current_year}-01-01",
        "endDate": f"{current_year}-12-31",
        "totalRentalIncome": float(effective_income),
        "totalRentCollected": float(total_rent_collected),
        "totalRentBilled": float(total_rent_billed),
        "totalRentOutstanding": float(total_rent_outstanding),
        "totalOperatingExpenses": float(total_operating_expenses),
        "totalCompanyExpenses": float(total_company_expenses),
        "totalTenantExpenses": float(total_tenant_expenses),
        "totalSalariesPaid": float(total_salaries_paid),
        "netOperatingIncome": float(net_operating_income),
        "netOperatingProfit": float(net_operating_income),
        "netProfit": float(net_operating_income),
        "totalRevenue": float(effective_income),
        "totalExpenses": float(total_operating_expenses),
        "expensesByCategory": expenses_by_category,
        "monthlyBreakdown": monthly_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_godown_pnl_view(request):
    year_param = request.GET.get('year')
    current_year = int(year_param) if year_param else timezone.now().year
    year_str = f"{current_year:04d}"

    godowns = Godown.objects.filter(is_deleted=False).order_by('name')
    pnl_list = []

    for godown in godowns:
        rev_paid = RentEntry.objects.filter(
            godown=godown
        ).filter(
            Q(rent_month__startswith=year_str) | Q(due_date__year=current_year) | Q(payment_date__year=current_year)
        ).aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')

        rev_billed = RentEntry.objects.filter(
            godown=godown
        ).filter(
            Q(rent_month__startswith=year_str) | Q(due_date__year=current_year) | Q(payment_date__year=current_year)
        ).aggregate(total=Sum('due_amount'))['total'] or Decimal('0')

        rev = rev_paid if rev_paid > 0 else rev_billed

        exp = Expense.objects.filter(
            godown=godown,
            is_deleted=False,
            bill_date__year=current_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        sal = SalaryPayment.objects.filter(
            employee__godown=godown,
            status='PAID'
        ).filter(
            Q(payment_month__startswith=year_str) | Q(payment_date__year=current_year)
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_exp = exp + sal
        net = rev - total_exp
        margin = (net / rev * 100) if rev > 0 else Decimal('0')

        pnl_list.append({
            "godownId": godown.id,
            "godownName": godown.name,
            "godownCode": godown.code,
            "city": godown.city or "Hyderabad",
            "tenantName": godown.current_tenant or "Vacant",
            "occupancyStatus": godown.status,
            "rentalIncome": float(rev),
            "rentIncome": float(rev),
            "grossRentCollected": float(rev_paid),
            "rentBilled": float(rev_billed),
            "revenue": float(rev),
            "operatingExpenses": float(total_exp),
            "utilityAndMaintExpenses": float(exp),
            "staffExpense": float(sal),
            "expenses": float(total_exp),
            "netIncome": float(net),
            "netOperatingIncome": float(net),
            "netProfit": float(net),
            "margin": round(float(margin), 1),
            "profitMargin": round(float(margin), 1)
        })

    return api_success(pnl_list)


@api_view(['GET'])
@permission_classes([AllowAny])
def reports_export_csv_view(request):
    year_param = request.GET.get('year')
    current_year = int(year_param) if year_param else timezone.now().year
    year_str = f"{current_year:04d}"

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="rgs_financial_report_{current_year}.csv"'

    writer = csv.writer(response)
    writer.writerow(['Godown ID', 'Facility Name', 'Code', 'City', 'Tenant', 'Rent Collected (INR)', 'Operating Expenses (INR)', 'Staff Expense (INR)', 'Net Operating Profit (INR)', 'Status'])

    godowns = Godown.objects.filter(is_deleted=False).order_by('name')
    for godown in godowns:
        rev = RentEntry.objects.filter(
            godown=godown
        ).filter(
            Q(rent_month__startswith=year_str) | Q(due_date__year=current_year) | Q(payment_date__year=current_year)
        ).aggregate(total=Sum('paid_amount'))['total'] or Decimal('0')

        exp = Expense.objects.filter(
            godown=godown,
            is_deleted=False,
            bill_date__year=current_year
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        sal = SalaryPayment.objects.filter(
            employee__godown=godown,
            status='PAID'
        ).filter(
            Q(payment_month__startswith=year_str) | Q(payment_date__year=current_year)
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        net = rev - (exp + sal)
        writer.writerow([
            godown.id,
            godown.name,
            godown.code,
            godown.city or "Hyderabad",
            godown.current_tenant or "Vacant",
            float(rev),
            float(exp),
            float(sal),
            float(net),
            godown.status
        ])

    return response


# ============================================================================
# APP SETTINGS
# ============================================================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def settings_view(request):
    app_setting = AppSettings.objects.first()
    if not app_setting:
        app_setting = AppSettings.objects.create(
            company_name='RGS ENTERPRISES',
            currency_symbol='₹',
            contact_email='rgsenterprise2026@gmail.com',
            contact_phone='+91 98480 22338',
            logo_url='/2.jpeg'
        )

    if request.method == 'GET':
        return api_success(AppSettingsSerializer(app_setting).data)

    elif request.method == 'PUT':
        data = request.data
        if 'companyName' in data:
            app_setting.company_name = data['companyName']
        if 'currencySymbol' in data:
            app_setting.currency_symbol = data['currencySymbol']
        elif 'defaultCurrency' in data:
            app_setting.currency_symbol = data['defaultCurrency']
        if 'contactEmail' in data:
            app_setting.contact_email = data['contactEmail']
        if 'contactPhone' in data:
            app_setting.contact_phone = data['contactPhone']
        if 'logoUrl' in data:
            app_setting.logo_url = data['logoUrl']

        app_setting.save()
        return api_success(AppSettingsSerializer(app_setting).data)
