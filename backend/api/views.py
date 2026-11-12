import csv
import datetime
import io
import os
import bcrypt
import jwt
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import Sum, Q, Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    AppUser, Godown, RentEntry, Expense, Employee,
    SalaryPayment, Asset, Document, AppSettings, ActivityLog,
    HubBroadband, FinanceTotalRevenue, FinanceRent
)
from .serializers import (
    AppUserSerializer, GodownSerializer, RentEntrySerializer,
    ExpenseSerializer, EmployeeSerializer, SalaryPaymentSerializer,
    AssetSerializer, DocumentSerializer, AppSettingsSerializer,
    HubBroadbandSerializer, FinanceTotalRevenueSerializer, FinanceRentSerializer
)
from .crypto import encrypt_password, decrypt_password


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

    # Calculate Profit = Total Revenue - Rent Total per month across all hubs:
    total_revenue_sum = Decimal('0')
    total_rent_sum = Decimal('0')

    for hub in godowns:
        # Hub's Total Revenue: check FinanceTotalRevenue for this hub, else fallback to hub.monthly_rent
        hub_rev_rec = FinanceTotalRevenue.objects.filter(hub=hub).order_by('-financial_year', '-id').first()
        if hub_rev_rec and hub_rev_rec.total_revenue is not None:
            hub_revenue = Decimal(str(hub_rev_rec.total_revenue))
        else:
            hub_revenue = Decimal(str(hub.monthly_rent or '0'))
        total_revenue_sum += hub_revenue

        # Hub's Rent Total: check FinanceRent for current month or latest period, else fallback to hub.monthly_rent
        hub_rent_rec = FinanceRent.objects.filter(hub=hub, period=current_month_str).first()
        if not hub_rent_rec:
            hub_rent_rec = FinanceRent.objects.filter(hub=hub).order_by('-period', '-id').first()

        if hub_rent_rec and hub_rent_rec.total is not None:
            hub_rent = Decimal(str(hub_rent_rec.total))
        else:
            hub_rent = Decimal(str(hub.monthly_rent or '0'))
        total_rent_sum += hub_rent

    monthly_profit = total_revenue_sum - total_rent_sum

    return api_success({
        "totalGodowns": total_godowns,
        "activeGodowns": active_godowns,
        "totalCapacitySqFt": float(total_capacity),
        "occupiedSqFt": float(occupied_capacity),
        "occupancyPercentage": round(float(occupancy_rate), 1),
        "occupancyRate": round(float(occupancy_rate), 1),
        "monthlyRentExpected": float(monthly_rent_expected),
        "monthlyRentCollected": float(monthly_rent_collected),
        "monthlyTotalRevenue": float(total_revenue_sum),
        "monthlyRentTotal": float(total_rent_sum),
        "monthlyProfit": float(monthly_profit),
        "pendingRent": float(pending_rent),
        "monthlyExpenses": float(current_expenses),
        "netIncome": float(monthly_profit),
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
        data = request.data.copy()
        if 'erpName' in data and not data.get('name'):
            data['name'] = data['erpName']
        if 'locationAddress' in data and not data.get('address'):
            data['address'] = data['locationAddress']
        elif 'location' in data and not data.get('address'):
            data['address'] = data['location']
        if not data.get('code'):
            data['code'] = f"HUB-{int(timezone.now().timestamp()) % 10000}"
        if not data.get('city'):
            data['city'] = 'Hyderabad'
        if not data.get('state'):
            data['state'] = 'Telangana'

        raw_cctv_pwd = data.get('cctvPassword')
        broadband_list = data.get('broadbandDetails', [])

        serializer = GodownSerializer(data=data)
        if serializer.is_valid():
            with transaction.atomic():
                godown = serializer.save()
                
                # Encrypt CCTV Password
                if raw_cctv_pwd:
                    godown.cctv_password = encrypt_password(raw_cctv_pwd)
                    godown.save(update_fields=['cctv_password'])

                # Save broadband rows in single transaction
                if isinstance(broadband_list, list):
                    HubBroadband.objects.filter(hub=godown).delete()
                    for item in broadband_list:
                        if isinstance(item, dict):
                            HubBroadband.objects.create(
                                hub=godown,
                                network_provider=item.get('networkProvider') or item.get('network_provider'),
                                account_number=item.get('accountNumber') or item.get('account_number'),
                                registered_mobile=item.get('registeredMobile') or item.get('registeredMobileNumber') or item.get('registered_mobile'),
                                user_id=item.get('userId') or item.get('user_id'),
                                current_plan_end_date=item.get('currentPlanEndDate') or item.get('current_plan_end_date') or None,
                                service_contact_number=item.get('serviceContactNumber') or item.get('service_contact_number'),
                            )

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
        data = request.data.copy()
        if 'erpName' in data and not data.get('name'):
            data['name'] = data['erpName']
        if 'locationAddress' in data and not data.get('address'):
            data['address'] = data['locationAddress']
            
        raw_cctv_pwd = data.get('cctvPassword')
        broadband_list = data.get('broadbandDetails')

        serializer = GodownSerializer(godown, data=data, partial=True)
        if serializer.is_valid():
            with transaction.atomic():
                updated = serializer.save()
                
                if raw_cctv_pwd is not None:
                    updated.cctv_password = encrypt_password(raw_cctv_pwd)
                    updated.save(update_fields=['cctv_password'])
                    
                if isinstance(broadband_list, list):
                    HubBroadband.objects.filter(hub=updated).delete()
                    for item in broadband_list:
                        if isinstance(item, dict):
                            HubBroadband.objects.create(
                                hub=updated,
                                network_provider=item.get('networkProvider') or item.get('network_provider'),
                                account_number=item.get('accountNumber') or item.get('account_number'),
                                registered_mobile=item.get('registeredMobile') or item.get('registeredMobileNumber') or item.get('registered_mobile'),
                                user_id=item.get('userId') or item.get('user_id'),
                                current_plan_end_date=item.get('currentPlanEndDate') or item.get('current_plan_end_date') or None,
                                service_contact_number=item.get('serviceContactNumber') or item.get('service_contact_number'),
                            )
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
# FINANCE MODULE (TOTAL REVENUE & RENT)
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def finance_total_revenue_view(request):
    if request.method == 'GET':
        hub_id = request.GET.get('hubId')
        financial_year = request.GET.get('financialYear')
        qs = FinanceTotalRevenue.objects.select_related('hub').order_by('-financial_year', 'hub__name')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        if financial_year:
            qs = qs.filter(financial_year=financial_year)
        return api_success(FinanceTotalRevenueSerializer(qs, many=True).data)

    elif request.method == 'POST':
        data = request.data.copy()
        hub_id = data.get('hubId')
        financial_year = data.get('financialYear')
        if not hub_id or not financial_year:
            return api_error("hubId and financialYear are mandatory fields.")

        # Auto calculate total revenue if not explicitly provided
        rent = Decimal(str(data.get('rent') or '0'))
        setup_cost = Decimal(str(data.get('setupCostPerMonth') or '0'))
        electricity = Decimal(str(data.get('electricity') or '0'))
        manpower = Decimal(str(data.get('manpower') or '0'))
        housekeeping = Decimal(str(data.get('housekeeping') or '0'))
        wm = Decimal(str(data.get('wmRefreshmentPettyCash') or '0'))
        computed_rev = rent + setup_cost + electricity + manpower + housekeeping + wm
        if 'totalRevenue' in data and data.get('totalRevenue') is not None and str(data.get('totalRevenue')).strip() != '':
            data['totalRevenue'] = Decimal(str(data.get('totalRevenue')))
        else:
            data['totalRevenue'] = computed_rev

        existing = FinanceTotalRevenue.objects.filter(hub_id=hub_id, financial_year=financial_year).first()
        if existing:
            serializer = FinanceTotalRevenueSerializer(existing, data=data, partial=True)
            if serializer.is_valid():
                saved = serializer.save()
                return api_success(FinanceTotalRevenueSerializer(saved).data)
            return api_error("Validation error", errors=serializer.errors)

        serializer = FinanceTotalRevenueSerializer(data=data)
        if serializer.is_valid():
            saved = serializer.save()
            return api_success(FinanceTotalRevenueSerializer(saved).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def finance_total_revenue_detail_view(request, pk):
    try:
        obj = FinanceTotalRevenue.objects.select_related('hub').get(pk=pk)
    except FinanceTotalRevenue.DoesNotExist:
        return api_error("Finance Total Revenue record not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(FinanceTotalRevenueSerializer(obj).data)

    elif request.method == 'PUT':
        data = request.data.copy()
        rent = Decimal(str(data.get('rent', obj.rent) or '0'))
        setup_cost = Decimal(str(data.get('setupCostPerMonth', obj.setup_cost_per_month) or '0'))
        electricity = Decimal(str(data.get('electricity', obj.electricity) or '0'))
        manpower = Decimal(str(data.get('manpower', obj.manpower) or '0'))
        housekeeping = Decimal(str(data.get('housekeeping', obj.housekeeping) or '0'))
        wm = Decimal(str(data.get('wmRefreshmentPettyCash', obj.wm_refreshment_petty_cash) or '0'))
        computed_rev = rent + setup_cost + electricity + manpower + housekeeping + wm
        if 'totalRevenue' in data and data.get('totalRevenue') is not None and str(data.get('totalRevenue')).strip() != '':
            data['totalRevenue'] = Decimal(str(data.get('totalRevenue')))
        else:
            data['totalRevenue'] = computed_rev

        serializer = FinanceTotalRevenueSerializer(obj, data=data, partial=True)
        if serializer.is_valid():
            saved = serializer.save()
            return api_success(FinanceTotalRevenueSerializer(saved).data)
        return api_error("Validation error", errors=serializer.errors)

    elif request.method == 'DELETE':
        obj.delete()
        return api_success({"message": "Record deleted successfully"})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def finance_rent_view(request):
    if request.method == 'GET':
        hub_id = request.GET.get('hubId')
        period = request.GET.get('period')
        qs = FinanceRent.objects.select_related('hub').order_by('-period', 'hub__name')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        if period:
            qs = qs.filter(period=period)
        return api_success(FinanceRentSerializer(qs, many=True).data)

    elif request.method == 'POST':
        data = request.data.copy()
        hub_id = data.get('hubId')
        period = data.get('period')
        if not hub_id or not period:
            return api_error("hubId and period are mandatory fields.")

        # Live calculation formulas:
        # TDS Amount = Rent * 10%
        # Total Rent After TDS = Rent - TDS Amount
        # GST Amount = Rent * 18%
        # Total Rent Including GST = Total Rent After TDS + GST Amount
        # Total = Total Rent Including GST + Electricity Bill + Sorter Payments + Petty Cash
        rent = Decimal(str(data.get('rent') or '0'))
        tds_percent = Decimal(str(data.get('tdsPercent') or '10'))
        tds_amount = (rent * tds_percent) / Decimal('100')
        rent_after_tds = rent - tds_amount
        
        gst_percent = Decimal(str(data.get('gstPercent') or '18'))
        gst_amount = (rent * gst_percent) / Decimal('100')
        rent_inc_gst = rent_after_tds + gst_amount
        
        elec_bill = Decimal(str(data.get('electricityBill') or '0'))
        sorter_pay = Decimal(str(data.get('sorterPayments') or '0'))
        petty_cash = Decimal(str(data.get('pettyCash') or '0'))
        computed_total = rent_inc_gst + elec_bill + sorter_pay + petty_cash

        data['tdsAmount'] = tds_amount
        data['totalRentAfterTds'] = rent_after_tds
        data['gstAmount'] = gst_amount
        data['totalRentIncludingGst'] = rent_inc_gst
        if 'total' in data and data.get('total') is not None and str(data.get('total')).strip() != '':
            data['total'] = Decimal(str(data.get('total')))
        else:
            data['total'] = computed_total

        existing = FinanceRent.objects.filter(hub_id=hub_id, period=period).first()
        if existing:
            serializer = FinanceRentSerializer(existing, data=data, partial=True)
            if serializer.is_valid():
                saved = serializer.save()
                return api_success(FinanceRentSerializer(saved).data)
            return api_error("Validation error", errors=serializer.errors)

        serializer = FinanceRentSerializer(data=data)
        if serializer.is_valid():
            saved = serializer.save()
            return api_success(FinanceRentSerializer(saved).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def finance_rent_detail_view(request, pk):
    try:
        obj = FinanceRent.objects.select_related('hub').get(pk=pk)
    except FinanceRent.DoesNotExist:
        return api_error("Finance Rent record not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(FinanceRentSerializer(obj).data)

    elif request.method == 'PUT':
        data = request.data.copy()
        rent = Decimal(str(data.get('rent', obj.rent) or '0'))
        tds_percent = Decimal(str(data.get('tdsPercent', obj.tds_percent) or '10'))
        tds_amount = (rent * tds_percent) / Decimal('100')
        rent_after_tds = rent - tds_amount
        
        gst_percent = Decimal(str(data.get('gstPercent', obj.gst_percent) or '18'))
        gst_amount = (rent * gst_percent) / Decimal('100')
        rent_inc_gst = rent_after_tds + gst_amount
        
        elec_bill = Decimal(str(data.get('electricityBill', obj.electricity_bill) or '0'))
        sorter_pay = Decimal(str(data.get('sorterPayments', obj.sorter_payments) or '0'))
        petty_cash = Decimal(str(data.get('pettyCash', obj.petty_cash) or '0'))
        computed_total = rent_inc_gst + elec_bill + sorter_pay + petty_cash

        data['tdsAmount'] = tds_amount
        data['totalRentAfterTds'] = rent_after_tds
        data['gstAmount'] = gst_amount
        data['totalRentIncludingGst'] = rent_inc_gst
        if 'total' in data and data.get('total') is not None and str(data.get('total')).strip() != '':
            data['total'] = Decimal(str(data.get('total')))
        else:
            data['total'] = computed_total

        serializer = FinanceRentSerializer(obj, data=data, partial=True)
        if serializer.is_valid():
            saved = serializer.save()
            return api_success(FinanceRentSerializer(saved).data)
        return api_error("Validation error", errors=serializer.errors)

    elif request.method == 'DELETE':
        obj.delete()
        return api_success({"message": "Record deleted successfully"})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def hub_broadband_view(request):
    if request.method == 'GET':
        hub_id = request.GET.get('hubId')
        qs = HubBroadband.objects.select_related('hub')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        return api_success(HubBroadbandSerializer(qs, many=True).data)
    elif request.method == 'POST':
        serializer = HubBroadbandSerializer(data=request.data)
        if serializer.is_valid():
            saved = serializer.save()
            return api_success(HubBroadbandSerializer(saved).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def hub_broadband_detail_view(request, pk):
    try:
        bb = HubBroadband.objects.get(pk=pk)
        bb.delete()
        return api_success({"message": "Broadband record deleted"})
    except HubBroadband.DoesNotExist:
        return api_error("Broadband record not found", status_code=status.HTTP_404_NOT_FOUND)


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

    godowns = Godown.objects.filter(is_deleted=False)
    
    total_revenue_sum = Decimal('0')
    total_rent_sum = Decimal('0')
    total_setup_cost_sum = Decimal('0')

    now_month_str = timezone.now().strftime('%Y-%m')

    for hub in godowns:
        # Hub Total Revenue
        hub_rev_rec = FinanceTotalRevenue.objects.filter(hub=hub).order_by('-financial_year', '-id').first()
        if hub_rev_rec and hub_rev_rec.total_revenue is not None:
            hub_revenue = Decimal(str(hub_rev_rec.total_revenue))
            setup_cost = Decimal(str(hub_rev_rec.setup_cost_per_month or 0))
        else:
            hub_revenue = Decimal(str(hub.monthly_rent or '0'))
            setup_cost = Decimal('0')
        total_revenue_sum += hub_revenue
        total_setup_cost_sum += setup_cost

        # Hub Rent Outflow
        hub_rent_rec = FinanceRent.objects.filter(hub=hub, period=now_month_str).first()
        if not hub_rent_rec:
            hub_rent_rec = FinanceRent.objects.filter(hub=hub).order_by('-period', '-id').first()

        if hub_rent_rec and hub_rent_rec.total is not None:
            hub_rent = Decimal(str(hub_rent_rec.total))
        else:
            hub_rent = Decimal(str(hub.monthly_rent or '0'))
        total_rent_sum += hub_rent

    total_profit = total_revenue_sum - total_rent_sum
    total_margin = total_profit - total_setup_cost_sum
    margin_percent = round(float((total_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else Decimal('0')), 1)

    # Monthly breakdown for the year
    monthly_data = []
    for m in range(1, 13):
        month_str = f"{current_year:04d}-{m:02d}"
        month_label = datetime.date(current_year, m, 1).strftime('%B')
        
        m_rev = Decimal('0')
        m_rent = Decimal('0')
        for hub in godowns:
            f_rev = FinanceTotalRevenue.objects.filter(hub=hub).order_by('-financial_year', '-id').first()
            if f_rev and f_rev.total_revenue is not None:
                m_rev += Decimal(str(f_rev.total_revenue))
            else:
                m_rev += Decimal(str(hub.monthly_rent or '0'))

            f_rent = FinanceRent.objects.filter(hub=hub, period=month_str).first()
            if f_rent and f_rent.total is not None:
                m_rent += Decimal(str(f_rent.total))
            elif datetime.date(current_year, m, 1) <= timezone.now().date():
                m_rent += Decimal(str(hub.monthly_rent or '0'))

        m_profit = m_rev - m_rent
        monthly_data.append({
            "month": month_str,
            "monthName": month_label,
            "revenue": float(m_rev),
            "expenses": float(m_rent),
            "netProfit": float(m_profit),
            "totalProfit": float(m_profit)
        })

    return api_success({
        "year": current_year,
        "startDate": f"{current_year}-01-01",
        "endDate": f"{current_year}-12-31",
        "totalRentalIncome": float(total_revenue_sum),
        "totalRevenue": float(total_revenue_sum),
        "totalOperatingExpenses": float(total_rent_sum),
        "totalExpenses": float(total_rent_sum),
        "totalRentOutflow": float(total_rent_sum),
        "netOperatingIncome": float(total_profit),
        "netOperatingProfit": float(total_profit),
        "netProfit": float(total_profit),
        "totalProfit": float(total_profit),
        "totalMargin": float(total_margin),
        "marginPercent": margin_percent,
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
    now_month_str = timezone.now().strftime('%Y-%m')

    for godown in godowns:
        f_rev = FinanceTotalRevenue.objects.filter(hub=godown).order_by('-financial_year', '-id').first()
        if f_rev and f_rev.total_revenue is not None:
            hub_rev = Decimal(str(f_rev.total_revenue))
            setup_cost = Decimal(str(f_rev.setup_cost_per_month or 0))
        else:
            hub_rev = Decimal(str(godown.monthly_rent or '0'))
            setup_cost = Decimal('0')

        f_rent = FinanceRent.objects.filter(hub=godown, period=now_month_str).first()
        if not f_rent:
            f_rent = FinanceRent.objects.filter(hub=godown).order_by('-period', '-id').first()

        if f_rent and f_rent.total is not None:
            hub_rent = Decimal(str(f_rent.total))
        else:
            hub_rent = Decimal(str(godown.monthly_rent or '0'))

        hub_profit = hub_rev - hub_rent
        hub_margin = hub_profit - setup_cost
        margin_pct = round(float((hub_profit / hub_rev * 100) if hub_rev > 0 else 0), 1)

        pnl_list.append({
            "godownId": godown.id,
            "godownName": godown.erp_name or godown.name,
            "godownCode": godown.code,
            "city": godown.city or "Hyderabad",
            "tenantName": godown.current_tenant or "Vacant",
            "status": godown.status,
            "totalRevenue": float(hub_rev),
            "rentalIncome": float(hub_rev),
            "revenue": float(hub_rev),
            "totalRent": float(hub_rent),
            "operatingExpenses": float(hub_rent),
            "expenses": float(hub_rent),
            "totalProfit": float(hub_profit),
            "netProfit": float(hub_profit),
            "netOperatingIncome": float(hub_profit),
            "netIncome": float(hub_profit),
            "margin": float(hub_margin),
            "profitMargin": margin_pct,
        })

    return api_success(pnl_list)


@api_view(['GET'])
@permission_classes([AllowAny])
def reports_export_csv_view(request):
    export_type = request.GET.get('exportType') or request.GET.get('type') or 'total'
    hub_id = request.GET.get('hubId')
    year_param = request.GET.get('year')
    current_year = int(year_param) if year_param else timezone.now().year
    year_str = f"{current_year:04d}"

    app_settings = AppSettings.objects.first()
    vendor_name = app_settings.company_name if app_settings and app_settings.company_name else "RGS Enterprises"

    template_headers = [
        'Vendor', 'Hub Status', 'State', 'Hub Model', 'Owner', 'ERP Name',
        'Start Date', 'End Date', 'Tenure', 'Area',
        'Rent', 'Setup Cost/Month', 'Electricity', 'Manpower', 'Housekeeping', 'WM Refreshment/Petty Cash', 'Total Revenue',
        'Rent', 'TDS 10 %', 'TDS Amount', 'Total Rent After TDS', 'GST 18%', 'Total Rent Including GST', 'Electricity Bill', 'Sorter Payments', 'Petty Cash', 'Total',
        'Profit', 'Margin', 'Status'
    ]

    response = HttpResponse(content_type='text/csv; charset=utf-8')

    # SINGLE HUB (MONTH-BY-MONTH) EXPORT
    if export_type == 'single' and hub_id:
        try:
            godown = Godown.objects.get(pk=hub_id, is_deleted=False)
        except Godown.DoesNotExist:
            return api_error("Hub facility not found", status_code=status.HTTP_404_NOT_FOUND)

        hub_name_slug = (godown.erp_name or godown.name or f"hub_{godown.id}").replace(" ", "_")
        response['Content-Disposition'] = f'attachment; filename="rgs_{hub_name_slug}_monthly_{current_year}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Month'] + template_headers)

        hub_status = godown.hub_status or godown.status or 'Active'
        state = godown.state or 'ANDHRA PRADESH'
        hub_model = godown.hub_model or 'OSH'
        owner = godown.lease_contact_name or godown.current_tenant or 'Owner'
        erp_name = godown.erp_name or godown.name or f'Hub #{godown.id}'
        start_date = godown.lease_start_date.isoformat() if godown.lease_start_date else ''
        end_date = godown.lease_end_date.isoformat() if godown.lease_end_date else ''
        tenure = godown.lease_duration_months or ''
        area = float(godown.size_sqft or godown.total_capacity or 0)

        f_rev = FinanceTotalRevenue.objects.filter(hub=godown).order_by('-financial_year', '-id').first()
        rev_rent = float(f_rev.rent) if (f_rev and f_rev.rent is not None) else float(godown.monthly_rent or 0)
        setup_cost = float(f_rev.setup_cost_per_month) if (f_rev and f_rev.setup_cost_per_month is not None) else 0.0
        electricity_rev = float(f_rev.electricity) if (f_rev and f_rev.electricity is not None) else 0.0
        manpower = float(f_rev.manpower) if (f_rev and f_rev.manpower is not None) else 0.0
        housekeeping = float(f_rev.housekeeping) if (f_rev and f_rev.housekeeping is not None) else 0.0
        petty_cash_rev = float(f_rev.wm_refreshment_petty_cash) if (f_rev and f_rev.wm_refreshment_petty_cash is not None) else 0.0
        total_revenue = float(f_rev.total_revenue) if (f_rev and f_rev.total_revenue is not None) else (rev_rent + setup_cost + electricity_rev + manpower + housekeeping + petty_cash_rev)

        sum_rev_rent = 0.0
        sum_setup_cost = 0.0
        sum_elec_rev = 0.0
        sum_manpower = 0.0
        sum_housekeeping = 0.0
        sum_petty_rev = 0.0
        sum_total_rev = 0.0

        sum_rent_outflow = 0.0
        sum_tds_amt = 0.0
        sum_rent_after_tds = 0.0
        sum_rent_inc_gst = 0.0
        sum_elec_bill = 0.0
        sum_sorter = 0.0
        sum_petty_rent = 0.0
        sum_total_rent = 0.0
        sum_profit = 0.0
        sum_margin = 0.0

        # Export only the entered months for this hub
        f_rent_records = list(FinanceRent.objects.filter(hub=godown).order_by('period'))
        if year_param:
            year_filtered = [r for r in f_rent_records if r.period and r.period.startswith(year_str)]
            if year_filtered:
                f_rent_records = year_filtered

        rent_entries = []
        if not f_rent_records:
            re_qs = list(RentEntry.objects.filter(godown=godown).order_by('rent_month'))
            if year_param:
                re_year = [re for re in re_qs if re.rent_month and re.rent_month.startswith(year_str)]
                rent_entries = re_year if re_year else re_qs
            else:
                rent_entries = re_qs

        if f_rent_records:
            for f_rent in f_rent_records:
                period_str = f_rent.period or ''
                try:
                    parts = period_str.split('-')
                    month_label = datetime.date(int(parts[0]), int(parts[1]), 1).strftime('%b %Y')
                except Exception:
                    month_label = period_str or 'Month'

                rent_val = float(f_rent.rent or 0)
                tds_pct = float(f_rent.tds_percent or 10)
                tds_amt = float(f_rent.tds_amount if f_rent.tds_amount is not None else (rent_val * tds_pct / 100))
                rent_after_tds = float(f_rent.total_rent_after_tds if f_rent.total_rent_after_tds is not None else (rent_val - tds_amt))
                gst_pct = float(f_rent.gst_percent or 18)
                rent_inc_gst = float(f_rent.total_rent_including_gst if f_rent.total_rent_including_gst is not None else (rent_after_tds + (rent_after_tds * gst_pct / 100)))
                electricity_bill = float(f_rent.electricity_bill or 0)
                sorter_payments = float(f_rent.sorter_payments or 0)
                petty_cash_rent = float(f_rent.petty_cash or 0)
                total_rent = float(f_rent.total if f_rent.total is not None else (rent_inc_gst + electricity_bill + sorter_payments + petty_cash_rent))

                profit = total_revenue - total_rent
                margin = profit - setup_cost
                status_text = "Done"

                sum_rev_rent += rev_rent
                sum_setup_cost += setup_cost
                sum_elec_rev += electricity_rev
                sum_manpower += manpower
                sum_housekeeping += housekeeping
                sum_petty_rev += petty_cash_rev
                sum_total_rev += total_revenue

                sum_rent_outflow += rent_val
                sum_tds_amt += tds_amt
                sum_rent_after_tds += rent_after_tds
                sum_rent_inc_gst += rent_inc_gst
                sum_elec_bill += electricity_bill
                sum_sorter += sorter_payments
                sum_petty_rent += petty_cash_rent
                sum_total_rent += total_rent
                sum_profit += profit
                sum_margin += margin

                writer.writerow([
                    month_label, vendor_name, hub_status, state, hub_model, owner, erp_name,
                    start_date, end_date, tenure, area,
                    round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(total_revenue, 2),
                    round(rent_val, 2), f"{round(tds_pct, 1)}%", round(tds_amt, 2), round(rent_after_tds, 2), f"{round(gst_pct, 1)}%", round(rent_inc_gst, 2), round(electricity_bill, 2), round(sorter_payments, 2), round(petty_cash_rent, 2), round(total_rent, 2),
                    round(profit, 2), round(margin, 2), status_text
                ])

            # Bottom Total row for entered months
            writer.writerow([
                f'TOTAL ({len(f_rent_records)} Month{"s" if len(f_rent_records) != 1 else ""})', vendor_name, hub_status, state, hub_model, owner, erp_name,
                start_date, end_date, tenure, area,
                round(sum_rev_rent, 2), round(sum_setup_cost, 2), round(sum_elec_rev, 2), round(sum_manpower, 2), round(sum_housekeeping, 2), round(sum_petty_rev, 2), round(sum_total_rev, 2),
                round(sum_rent_outflow, 2), '', round(sum_tds_amt, 2), round(sum_rent_after_tds, 2), '', round(sum_rent_inc_gst, 2), round(sum_elec_bill, 2), round(sum_sorter, 2), round(sum_petty_rent, 2), round(sum_total_rent, 2),
                round(sum_profit, 2), round(sum_margin, 2), 'Done'
            ])

        elif rent_entries:
            for re in rent_entries:
                period_str = re.rent_month or ''
                try:
                    parts = period_str.split('-')
                    month_label = datetime.date(int(parts[0]), int(parts[1]), 1).strftime('%b %Y')
                except Exception:
                    month_label = period_str or 'Month'

                rent_val = float(re.due_amount or godown.monthly_rent or 0)
                tds_pct = 10.0
                tds_amt = rent_val * 0.10
                rent_after_tds = rent_val - tds_amt
                gst_pct = 18.0
                rent_inc_gst = rent_after_tds + (rent_after_tds * 0.18)
                electricity_bill = 0.0
                sorter_payments = 0.0
                petty_cash_rent = 0.0
                total_rent = rent_inc_gst

                profit = total_revenue - total_rent
                margin = profit - setup_cost
                status_text = re.status or 'Done'

                sum_rev_rent += rev_rent
                sum_setup_cost += setup_cost
                sum_elec_rev += electricity_rev
                sum_manpower += manpower
                sum_housekeeping += housekeeping
                sum_petty_rev += petty_cash_rev
                sum_total_rev += total_revenue

                sum_rent_outflow += rent_val
                sum_tds_amt += tds_amt
                sum_rent_after_tds += rent_after_tds
                sum_rent_inc_gst += rent_inc_gst
                sum_elec_bill += electricity_bill
                sum_sorter += sorter_payments
                sum_petty_rent += petty_cash_rent
                sum_total_rent += total_rent
                sum_profit += profit
                sum_margin += margin

                writer.writerow([
                    month_label, vendor_name, hub_status, state, hub_model, owner, erp_name,
                    start_date, end_date, tenure, area,
                    round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(total_revenue, 2),
                    round(rent_val, 2), f"{round(tds_pct, 1)}%", round(tds_amt, 2), round(rent_after_tds, 2), f"{round(gst_pct, 1)}%", round(rent_inc_gst, 2), round(electricity_bill, 2), round(sorter_payments, 2), round(petty_cash_rent, 2), round(total_rent, 2),
                    round(profit, 2), round(margin, 2), status_text
                ])

            writer.writerow([
                f'TOTAL ({len(rent_entries)} Month{"s" if len(rent_entries) != 1 else ""})', vendor_name, hub_status, state, hub_model, owner, erp_name,
                start_date, end_date, tenure, area,
                round(sum_rev_rent, 2), round(sum_setup_cost, 2), round(sum_elec_rev, 2), round(sum_manpower, 2), round(sum_housekeeping, 2), round(sum_petty_rev, 2), round(sum_total_rev, 2),
                round(sum_rent_outflow, 2), '', round(sum_tds_amt, 2), round(sum_rent_after_tds, 2), '', round(sum_rent_inc_gst, 2), round(sum_elec_bill, 2), round(sum_sorter, 2), round(sum_petty_rent, 2), round(sum_total_rent, 2),
                round(sum_profit, 2), round(sum_margin, 2), 'Done'
            ])
        else:
            writer.writerow([
                'No entered monthly records', vendor_name, hub_status, state, hub_model, owner, erp_name,
                start_date, end_date, tenure, area,
                round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(total_revenue, 2),
                0, '10.0%', 0, 0, '18.0%', 0, 0, 0, 0, 0,
                round(total_revenue, 2), round(total_revenue - setup_cost, 2), 'Pending'
            ])

        return response

    # TOTAL HUBS (PORTFOLIO SUMMARY) EXPORT
    response['Content-Disposition'] = f'attachment; filename="rgs_all_hubs_financial_report_{current_year}.csv"'
    writer = csv.writer(response)
    writer.writerow(template_headers)

    godowns = Godown.objects.filter(is_deleted=False).order_by('name')

    sum_area = 0.0
    sum_rev_rent = 0.0
    sum_setup_cost = 0.0
    sum_elec_rev = 0.0
    sum_manpower = 0.0
    sum_housekeeping = 0.0
    sum_petty_rev = 0.0
    sum_total_rev = 0.0

    sum_rent_outflow = 0.0
    sum_tds_amt = 0.0
    sum_rent_after_tds = 0.0
    sum_rent_inc_gst = 0.0
    sum_elec_bill = 0.0
    sum_sorter = 0.0
    sum_petty_rent = 0.0
    sum_total_rent = 0.0
    sum_profit = 0.0
    sum_margin = 0.0

    for godown in godowns:
        hub_status = godown.hub_status or godown.status or 'Active'
        state = godown.state or 'ANDHRA PRADESH'
        hub_model = godown.hub_model or 'OSH'
        owner = godown.lease_contact_name or godown.current_tenant or 'Owner'
        erp_name = godown.erp_name or godown.name or f'Hub #{godown.id}'
        start_date = godown.lease_start_date.isoformat() if godown.lease_start_date else ''
        end_date = godown.lease_end_date.isoformat() if godown.lease_end_date else ''
        tenure = godown.lease_duration_months or ''
        area = float(godown.size_sqft or godown.total_capacity or 0)

        # Revenue
        f_rev = FinanceTotalRevenue.objects.filter(hub=godown).order_by('-financial_year', '-id').first()
        rev_rent = float(f_rev.rent) if (f_rev and f_rev.rent is not None) else float(godown.monthly_rent or 0)
        setup_cost = float(f_rev.setup_cost_per_month) if (f_rev and f_rev.setup_cost_per_month is not None) else 0.0
        electricity_rev = float(f_rev.electricity) if (f_rev and f_rev.electricity is not None) else 0.0
        manpower = float(f_rev.manpower) if (f_rev and f_rev.manpower is not None) else 0.0
        housekeeping = float(f_rev.housekeeping) if (f_rev and f_rev.housekeeping is not None) else 0.0
        petty_cash_rev = float(f_rev.wm_refreshment_petty_cash) if (f_rev and f_rev.wm_refreshment_petty_cash is not None) else 0.0
        total_revenue = float(f_rev.total_revenue) if (f_rev and f_rev.total_revenue is not None) else (rev_rent + setup_cost + electricity_rev + manpower + housekeeping + petty_cash_rev)

        # Rent outflow (current month or latest)
        now_month_str = timezone.now().strftime('%Y-%m')
        f_rent = FinanceRent.objects.filter(hub=godown, period=now_month_str).first()
        if not f_rent:
            f_rent = FinanceRent.objects.filter(hub=godown).order_by('-period', '-id').first()

        if f_rent:
            rent_val = float(f_rent.rent or 0)
            tds_pct = float(f_rent.tds_percent or 10)
            tds_amt = float(f_rent.tds_amount if f_rent.tds_amount is not None else (rent_val * tds_pct / 100))
            rent_after_tds = float(f_rent.total_rent_after_tds if f_rent.total_rent_after_tds is not None else (rent_val - tds_amt))
            gst_pct = float(f_rent.gst_percent or 18)
            rent_inc_gst = float(f_rent.total_rent_including_gst if f_rent.total_rent_including_gst is not None else (rent_after_tds + (rent_after_tds * gst_pct / 100)))
            electricity_bill = float(f_rent.electricity_bill or 0)
            sorter_payments = float(f_rent.sorter_payments or 0)
            petty_cash_rent = float(f_rent.petty_cash or 0)
            total_rent = float(f_rent.total if f_rent.total is not None else (rent_inc_gst + electricity_bill + sorter_payments + petty_cash_rent))
        else:
            rent_val = float(godown.monthly_rent or 0)
            tds_pct = 10.0
            tds_amt = rent_val * 0.10
            rent_after_tds = rent_val - tds_amt
            gst_pct = 18.0
            rent_inc_gst = rent_after_tds + (rent_after_tds * 0.18)
            electricity_bill = 0.0
            sorter_payments = 0.0
            petty_cash_rent = 0.0
            total_rent = rent_inc_gst

        profit = total_revenue - total_rent
        margin = profit - setup_cost
        status_text = "Done"

        sum_area += area
        sum_rev_rent += rev_rent
        sum_setup_cost += setup_cost
        sum_elec_rev += electricity_rev
        sum_manpower += manpower
        sum_housekeeping += housekeeping
        sum_petty_rev += petty_cash_rev
        sum_total_rev += total_revenue

        sum_rent_outflow += rent_val
        sum_tds_amt += tds_amt
        sum_rent_after_tds += rent_after_tds
        sum_rent_inc_gst += rent_inc_gst
        sum_elec_bill += electricity_bill
        sum_sorter += sorter_payments
        sum_petty_rent += petty_cash_rent
        sum_total_rent += total_rent
        sum_profit += profit
        sum_margin += margin

        writer.writerow([
            vendor_name, hub_status, state, hub_model, owner, erp_name,
            start_date, end_date, tenure, area,
            round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(total_revenue, 2),
            round(rent_val, 2), f"{round(tds_pct, 1)}%", round(tds_amt, 2), round(rent_after_tds, 2), f"{round(gst_pct, 1)}%", round(rent_inc_gst, 2), round(electricity_bill, 2), round(sorter_payments, 2), round(petty_cash_rent, 2), round(total_rent, 2),
            round(profit, 2), round(margin, 2), status_text
        ])

    writer.writerow([
        'TOTAL', '', '', '', '', f"{len(godowns)} Hubs",
        '', '', '', round(sum_area, 2),
        round(sum_rev_rent, 2), round(sum_setup_cost, 2), round(sum_elec_rev, 2), round(sum_manpower, 2), round(sum_housekeeping, 2), round(sum_petty_rev, 2), round(sum_total_rev, 2),
        round(sum_rent_outflow, 2), '', round(sum_tds_amt, 2), round(sum_rent_after_tds, 2), '', round(sum_rent_inc_gst, 2), round(sum_elec_bill, 2), round(sum_sorter, 2), round(sum_petty_rent, 2), round(sum_total_rent, 2),
        round(sum_profit, 2), round(sum_margin, 2), 'Done'
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
