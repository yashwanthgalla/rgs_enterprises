import csv
import datetime
import io
import os
import re
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
from .permissions import (
    IsAdminRole,
    IsAdminOrManagerRole,
    IsManagerOrReadOnly,
    IsAdminOrReadOnly,
)

from .models import (
    AppUser, Godown, RentEntry, Expense, Employee,
    SalaryPayment, Asset, AppSettings,
    HubBroadband, FinanceTotalRevenue, FinanceRent
)
from .serializers import (
    AppUserSerializer, GodownSerializer, RentEntrySerializer,
    ExpenseSerializer, EmployeeSerializer, SalaryPaymentSerializer,
    AssetSerializer, AppSettingsSerializer,
    HubBroadbandSerializer, FinanceTotalRevenueSerializer, FinanceRentSerializer
)
from .crypto import encrypt_password, decrypt_password
from .email_service import (
    send_brevo_email,
    generate_otp_session,
    verify_otp_session,
    send_bill_notification_email,
    ALLOWED_RESET_EMAILS,
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
# AUTHENTICATION & AUTHORIZED ACCOUNTS
# ============================================================================
AUTHORIZED_ADMINS = [
    {
        "email": "rgsenterprise2026@gmail.com",
        "username": "saibabu",
        "full_name": "Sai Babu P",
        "password": "Admin@1",
        "role": "ADMIN",
    },
    {
        "email": "bschandrasekhar4@gmail.com",
        "username": "bschandrasekhar",
        "full_name": "B S Chandrasekhar",
        "password": "Admin@1",
        "role": "ADMIN",
    },
    {
        "email": "gprabhakar024@gmail.com",
        "username": "gprabhakar",
        "full_name": "G Prabhakar",
        "password": "Admin@1",
        "role": "ADMIN",
    },
    {
        "email": "nagayashwanthgalla@gmail.com",
        "username": "yashwanth",
        "full_name": "Naga Yashwanth Galla",
        "password": "Admin@1",
        "role": "ADMIN",
    },
    {
        "email": "admin@rgsenterprises.com",
        "username": "admin",
        "full_name": "System Administrator",
        "password": "Admin@1",
        "role": "ADMIN",
    },
]


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return api_error("Username and password are required")

    try:
        # Check against authorized admin list for seamless initial access
        auth_entry = next(
            (a for a in AUTHORIZED_ADMINS if a["email"].lower() == username.lower() or a["username"].lower() == username.lower()),
            None
        )

        if auth_entry and (password.lower() == auth_entry["password"].lower() or password.lower() == "admin@1"):
            user = AppUser.objects.filter(
                Q(email__iexact=auth_entry["email"]) | Q(username__iexact=auth_entry["username"])
            ).first()
            hashed = bcrypt.hashpw(b"Admin@1", bcrypt.gensalt(10)).decode('utf-8')
            if not user:
                user = AppUser.objects.create(
                    username=auth_entry["username"],
                    email=auth_entry["email"],
                    full_name=auth_entry["full_name"],
                    password_hash=hashed,
                    role=auth_entry["role"],
                    must_change_password=True,
                )
            elif not user.must_change_password:
                # User has customized their password already, check against their stored hash
                pwd_bytes = password.encode('utf-8')
                hash_bytes = user.password_hash.encode('utf-8')
                if not bcrypt.checkpw(pwd_bytes, hash_bytes):
                    return api_error("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)
            else:
                # User still has must_change_password=True, keep it True for first-time password change
                pass

            token = generate_jwt_token(user)
            return api_success({
                "token": token,
                "tokenType": "Bearer",
                "expiresIn": settings.JWT_EXPIRATION_MS,
                "mustChangePassword": user.must_change_password,
                "user": AppUserSerializer(user).data
            })

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
        clean_username = username.strip()
        if AppUser.objects.filter(username__iexact=clean_username).exclude(id=user.id).exists():
            return api_error("Username is already taken. Please choose another.")
        user.username = clean_username
    if email:
        clean_email = email.strip()
        if AppUser.objects.filter(email__iexact=clean_email).exclude(id=user.id).exists():
            return api_error("Email is already registered by another account.")
        user.email = clean_email

    if new_password:
        if not user.must_change_password:
            if not current_password:
                return api_error("Current password is required to set a new password")
            if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
                return api_error("Current password is incorrect")
        else:
            if current_password and not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
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


@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_view(request):
    raw_username = request.query_params.get('username', '').strip()
    if not raw_username:
        return api_error("Username parameter is required")
    
    # Check if taken by another user
    exists = AppUser.objects.filter(username__iexact=raw_username).exclude(
        id=getattr(request.user, 'id', None)
    ).exists()
    return api_success({"available": not exists, "username": raw_username})


# ============================================================================
# FORGOT PASSWORD & STATELESS OTP DISPATCH
# ============================================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def send_forgot_password_otp_view(request):
    raw_email = request.data.get('email', '').strip().lower()
    if not raw_email:
        return api_error("Email address is required.")

    # 1. Find user by email or username, or seed from authorized admin list
    user = AppUser.objects.filter(Q(email__iexact=raw_email) | Q(username__iexact=raw_email)).first()
    if not user:
        auth_entry = next((a for a in AUTHORIZED_ADMINS if a["email"].lower() == raw_email or a["username"].lower() == raw_email), None)
        if auth_entry:
            hashed = bcrypt.hashpw(auth_entry["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            user = AppUser.objects.create(
                username=auth_entry["username"],
                email=auth_entry["email"],
                full_name=auth_entry["full_name"],
                password_hash=hashed,
                role=auth_entry["role"],
                must_change_password=True,
            )
        else:
            return api_error(f"No account found associated with '{raw_email}'. Please verify your email.", status_code=status.HTTP_404_NOT_FOUND)

    # 2. Determine target receiver email
    receiver_email = raw_email if '@' in raw_email else (user.email or '').strip().lower()
    if not receiver_email:
        return api_error("The specified account does not have a valid email address.", status_code=status.HTTP_400_BAD_REQUEST)

    # 3. Generate 6-digit OTP and stateless session token (10 mins)
    otp, session_token = generate_otp_session(receiver_email, exp_minutes=10)

    # 4. Construct professional email template with official RGS Logo
    subject = "RGS Enterprises — Password Reset Verification Code"
    copy_url = request.build_absolute_uri(f"/api/auth/copy-otp?code={otp}")
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://raw.githubusercontent.com/yashwanthgalla/rgs_enterprises/main/frontend/public/2.jpeg" alt="RGS Enterprises Logo" style="width: 60px; height: 60px; object-fit: contain; border-radius: 14px; border: 1px solid #E5E7EB; background: #FFFFFF; padding: 4px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />
            <h1 style="font-size: 18px; font-weight: 800; color: #111827; margin: 12px 0 2px; letter-spacing: -0.3px;">RGS ENTERPRISES</h1>
            <p style="font-size: 11px; color: #6B7280; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Warehouse & Facility Management Platform</p>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px; text-align: center;">Password Reset Request</h2>
        <p style="font-size: 13px; color: #4B5563; line-height: 1.5; margin: 0 0 20px; text-align: center;">
            Hello {user.full_name or user.username},<br>
            Use the 6-digit verification code below to reset your portal password. This code will expire in <strong>10 minutes</strong>.
        </p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Your Verification Code</p>
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                    <td style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 10px 22px; vertical-align: middle;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0071E3; user-select: all; -webkit-user-select: all; display: inline-block;">{otp}</span>
                    </td>
                    <td style="padding-left: 10px; vertical-align: middle;">
                        <a href="{copy_url}" target="_blank" style="display: inline-block; background: #0071E3; border-radius: 10px; padding: 12px 16px; text-decoration: none; color: #ffffff; font-size: 12px; font-weight: 700; line-height: 1; box-shadow: 0 2px 6px rgba(0, 113, 227, 0.25);" title="Copy OTP to Clipboard">
                            <img src="https://api.iconify.design/lucide:copy.svg?color=%23ffffff" alt="Copy" style="width: 15px; height: 15px; vertical-align: middle; display: inline-block; margin-right: 5px;" /><span style="vertical-align: middle;">Copy</span>
                        </a>
                    </td>
                </tr>
            </table>
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #94A3B8;">Click "Copy" or tap the code to copy to clipboard</p>
        </div>
        <p style="font-size: 12px; color: #6B7280; line-height: 1.5; margin: 0 0 16px;">
            If you did not request this password reset, please ignore this email or notify your system administrator immediately.
        </p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9CA3AF; text-align: center; margin: 0;">
            RGS Enterprises • Warehouse & Facility Management Platform
        </p>
    </div>
    """

    sent = send_brevo_email(
        to_email=receiver_email,
        subject=subject,
        html_content=html_content,
        text_content=f"Your RGS Enterprises password reset verification code is {otp}. Valid for 10 minutes. Copy link: {copy_url}"
    )

    if not sent:
        return api_error(
            "Failed to dispatch OTP email. Please ensure your email address is valid.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return api_success({
        "sessionToken": session_token,
        "email": receiver_email,
        "expiresInMinutes": 10
    }, message=f"Verification OTP sent to {receiver_email}. Valid for 10 minutes.")


@api_view(['GET'])
@permission_classes([AllowAny])
def copy_otp_redirect_view(request):
    code = request.GET.get('code', '').strip()
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Copied — RGS Enterprises</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #F5F5F7;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }}
        .card {{
            background: #ffffff;
            border: 1px solid #E5E7EB;
            border-radius: 20px;
            padding: 32px 28px;
            max-width: 360px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }}
        .badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 9999px;
            background: #DCFCE7;
            color: #15803D;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 16px;
        }}
        .code {{
            font-family: "Courier New", Courier, monospace;
            font-size: 34px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #0071E3;
            background: #F8FAFC;
            border: 1px solid #CBD5E1;
            border-radius: 12px;
            padding: 12px 18px;
            margin: 16px 0;
            user-select: all;
        }}
        p {{
            font-size: 13px;
            color: #6B7280;
            line-height: 1.5;
            margin: 0;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">✓ Copied to Clipboard!</div>
        <div class="code" id="otpCode">{code}</div>
        <p>Verification code <strong>{code}</strong> has been copied to your clipboard. You can now paste it into the RGS Enterprises verification portal.</p>
    </div>
    <script>
        try {{
            navigator.clipboard.writeText("{code}").catch(function() {{
                var ta = document.createElement('textarea');
                ta.value = "{code}";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }});
        }} catch(e) {{}}
    </script>
</body>
</html>"""
    return HttpResponse(html, content_type="text/html")


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_and_reset_password_view(request):
    raw_email = request.data.get('email', '').strip().lower()
    otp = request.data.get('otp', '').strip()
    session_token = request.data.get('sessionToken', '').strip()
    new_password = request.data.get('newPassword', '').strip()

    if not raw_email or not otp or not session_token or not new_password:
        return api_error("Email, OTP code, session token, and new password are required.")

    if len(new_password) < 6:
        return api_error("Password must be at least 6 characters long.")

    # 1. Verify stateless OTP session
    is_valid = verify_otp_session(session_token, raw_email, otp)
    if not is_valid:
        return api_error("Invalid or expired verification code. Please request a new OTP.", status_code=status.HTTP_400_BAD_REQUEST)

    # 2. Update user password
    user = AppUser.objects.filter(Q(email__iexact=raw_email) | Q(username__iexact=raw_email)).first()
    if not user:
        return api_error("User account not found.", status_code=status.HTTP_404_NOT_FOUND)

    salt = bcrypt.gensalt()
    user.password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')
    user.must_change_password = False
    user.updated_at = timezone.now()
    user.save(update_fields=['password_hash', 'must_change_password', 'updated_at'])

    return api_success(message="Password has been reset successfully. You can now login with your new password.")


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

    # Optimized Bulk Fetch: eliminate N+1 queries across godowns
    hub_ids = [h.id for h in godowns]

    # Pre-fetch latest revenue records for all hubs
    rev_records = FinanceTotalRevenue.objects.filter(hub_id__in=hub_ids).order_by('financial_year', 'id')
    latest_rev_by_hub = {}
    for r in rev_records:
        latest_rev_by_hub[r.hub_id] = r.total_revenue

    # Pre-fetch current month rent records
    rent_curr = FinanceRent.objects.filter(hub_id__in=hub_ids, period=current_month_str)
    curr_rent_by_hub = {r.hub_id: r.total for r in rent_curr}

    # Pre-fetch latest rent records as fallback
    rent_latest = FinanceRent.objects.filter(hub_id__in=hub_ids).order_by('period', 'id')
    latest_rent_by_hub = {}
    for r in rent_latest:
        latest_rent_by_hub[r.hub_id] = r.total

    for hub in godowns:
        hub_rev_val = latest_rev_by_hub.get(hub.id)
        if hub_rev_val is not None:
            hub_revenue = Decimal(str(hub_rev_val))
        else:
            hub_revenue = Decimal(str(hub.monthly_rent or '0'))
        total_revenue_sum += hub_revenue

        hub_rent_val = curr_rent_by_hub.get(hub.id)
        if hub_rent_val is None:
            hub_rent_val = latest_rent_by_hub.get(hub.id)

        if hub_rent_val is not None:
            hub_rent = Decimal(str(hub_rent_val))
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

        total_expenses = expense
        trends.append({
            "month": month_str,
            "monthLabel": month_label,
            "revenue": float(revenue),
            "expenses": float(total_expenses),
            "netProfit": float(revenue - total_expenses)
        })

    return api_success(trends)


# ============================================================================
# GODOWNS & HUB CODE ENGINE
# ============================================================================
STATE_CODE_MAP = {
    'telangana': 'TS',
    'telengana': 'TS',
    'andhra pradesh': 'AP',
    'karnataka': 'KA',
    'tamil nadu': 'TN',
    'maharashtra': 'MH',
    'kerala': 'KL',
    'gujarat': 'GJ',
    'delhi': 'DL',
    'national capital territory of delhi': 'DL',
    'uttar pradesh': 'UP',
    'west bengal': 'WB',
    'rajasthan': 'RJ',
    'madhya pradesh': 'MP',
    'bihar': 'BR',
    'punjab': 'PB',
    'haryana': 'HR',
    'odisha': 'OD',
    'orissa': 'OD',
    'assam': 'AS',
    'jharkhand': 'JH',
    'chhattisgarh': 'CG',
    'uttarakhand': 'UK',
    'himachal pradesh': 'HP',
    'goa': 'GA',
    'tripura': 'TR',
    'meghalaya': 'ML',
    'manipur': 'MN',
    'nagaland': 'NL',
    'mizoram': 'MZ',
    'sikkim': 'SK',
    'arunachal pradesh': 'AR',
    'jammu and kashmir': 'JK',
    'jammu & kashmir': 'JK',
    'ladakh': 'LA',
    'puducherry': 'PY',
    'pondicherry': 'PY',
    'chandigarh': 'CH',
    'dadra and nagar haveli': 'DN',
    'daman and diu': 'DN',
    'andaman and nicobar islands': 'AN',
    'lakshadweep': 'LD',
}

def get_state_code(state_name: str) -> str:
    """Returns the official 2-letter uppercase code for an Indian state."""
    if not state_name:
        return 'TS'
    cleaned = state_name.strip().lower()
    if cleaned in STATE_CODE_MAP:
        return STATE_CODE_MAP[cleaned]
    if 'telen' in cleaned or 'telan' in cleaned:
        return 'TS'
    if 'andhra' in cleaned:
        return 'AP'
    letters = re.sub(r'[^A-Za-z]', '', state_name).upper()
    return letters[:2] if len(letters) >= 2 else (letters + 'X')[:2]


def generate_next_hub_code(state_name: str) -> str:
    """
    Generates sequential hub code starting with State code followed by # and 2-digit zero-padded number.
    e.g. Telangana -> TS#01, next hub in TS -> TS#02.
    Uses lowest-gap filling so any deleted/available number is reclaimed first.
    """
    prefix = get_state_code(state_name) + '#'
    existing_codes = list(Godown.objects.filter(is_deleted=False).filter(
        Q(code__istartswith=prefix) | Q(state__iexact=state_name)
    ).values_list('code', flat=True))

    used_numbers = set()
    pattern = re.compile(rf'^{re.escape(prefix)}(\d+)$', re.IGNORECASE)
    for c in existing_codes:
        if not c:
            continue
        m = pattern.match(c.strip())
        if m:
            try:
                used_numbers.add(int(m.group(1)))
            except ValueError:
                pass
        else:
            c_str = c.strip().upper()
            st_prefix = get_state_code(state_name)
            if c_str.startswith(st_prefix):
                m2 = re.search(r'(\d+)$', c_str)
                if m2:
                    try:
                        used_numbers.add(int(m2.group(1)))
                    except ValueError:
                        pass

    # Find lowest available positive integer candidate (gap-filling)
    candidate = 1
    while candidate in used_numbers:
        candidate += 1

    # Hub code starts with 0 only (2-digit zero-padded: TS#01, TS#02)
    return f"{prefix}{candidate:02d}"


def resequence_hub_codes_for_state(state_name: str):
    """
    Ensures all active hubs in a state have contiguous, sequential Hub IDs (e.g. TS#01, TS#02, TS#03)
    upon addition and deletion, leaving zero gaps.
    """
    if not state_name:
        return
    prefix = get_state_code(state_name) + '#'
    pattern = re.compile(rf'^{re.escape(prefix)}(\d+)$', re.IGNORECASE)

    active_hubs = list(Godown.objects.filter(is_deleted=False, state__iexact=state_name))
    if not active_hubs:
        return

    def get_sort_key(h):
        if h.code:
            m = pattern.match(h.code.strip())
            if m:
                return (0, int(m.group(1)))
            m2 = re.search(r'(\d+)$', h.code.strip())
            if m2:
                return (0, int(m2.group(1)))
        return (1, h.id)

    active_hubs.sort(key=get_sort_key)

    # Pass 1: Set temporary codes to prevent unique constraint collisions
    for idx, hub in enumerate(active_hubs, start=1):
        target_code = f"{prefix}{idx:02d}"
        if hub.code != target_code:
            hub.code = f"TMP_{hub.id}_{target_code}"
            hub.save(update_fields=['code'])

    # Pass 2: Set clean contiguous sequential codes
    for idx, hub in enumerate(active_hubs, start=1):
        target_code = f"{prefix}{idx:02d}"
        if hub.code != target_code:
            hub.code = target_code
            hub.save(update_fields=['code'])


def get_godown_by_id_or_code(pk):
    """
    Enables the Hub Code (e.g. TS#01) to serve as primary identification key across all endpoints.
    """
    if pk is None:
        return None
    s = str(pk).strip()
    if s.isdigit():
        g = Godown.objects.filter(pk=int(s), is_deleted=False).first()
        if g:
            return g
    return Godown.objects.filter(code__iexact=s, is_deleted=False).first()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def next_godown_code_view(request):
    """
    Returns the next auto-calculated sequential hub code for a selected state.
    """
    state_name = request.GET.get('state', 'Telangana').strip()
    code = generate_next_hub_code(state_name)
    prefix = get_state_code(state_name) + '#'
    return api_success({
        "code": code,
        "state": state_name,
        "prefix": prefix,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsManagerOrReadOnly])
def godowns_view(request):
    if request.method == 'GET':
        # Auto-migrate any legacy random HUB-xxx codes (e.g. HUB-894) directly to sequential State#01 in database
        legacy_hubs = Godown.objects.filter(code__istartswith='HUB-', is_deleted=False)
        if legacy_hubs.exists():
            for lh in legacy_hubs:
                lh_state = lh.state or 'Telangana'
                lh.code = generate_next_hub_code(lh_state)
                lh.save(update_fields=['code'])

        page_raw = int(request.GET.get('page', 0))
        # Support both 1-indexed (page=1) and 0-indexed (page=0) requests for the first page
        page_index = max(0, page_raw - 1) if page_raw > 0 else 0
        size = int(request.GET.get('size', 50))
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', '').strip()
        show_deleted = str(request.GET.get('show_deleted', 'false')).lower() == 'true'

        if show_deleted:
            qs = Godown.objects.all()
        else:
            qs = Godown.objects.filter(is_deleted=False)

        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search) | Q(city__icontains=search) | Q(state__icontains=search))
        if status_filter:
            qs = qs.filter(status=status_filter)

        total_count = qs.count()
        start = page_index * size
        end = start + size
        godowns = qs.order_by('id')[start:end]

        data = GodownSerializer(godowns, many=True).data
        return api_success({
            "content": data,
            "totalElements": total_count,
            "totalPages": (total_count + size - 1) // size if size > 0 else 1,
            "number": page_raw,
            "size": size
        })

    elif request.method == 'POST':
        data = request.data.copy()
        if 'erpName' in data and not data.get('name'):
            data['name'] = data['erpName']
        if 'locationAddress' in data and not data.get('address'):
            data['address'] = data['locationAddress']
        if 'ownerName' in data and not data.get('owner_name'):
            data['owner_name'] = data['ownerName']
        elif 'owner_name' in data and not data.get('ownerName'):
            data['ownerName'] = data['owner_name']
        elif 'location' in data and not data.get('address'):
            data['address'] = data['location']
        if 'ownerName' in data and not data.get('owner_name'):
            data['owner_name'] = data['ownerName']
        elif 'owner_name' in data and not data.get('ownerName'):
            data['ownerName'] = data['owner_name']

        # 1. State: strictly asked from user and normalized
        state = str(data.get('state') or 'Telangana').strip()
        data['state'] = state

        # 2. Sequential Hub Code: Always strictly automated by system based on State (no manual tampering)
        data['code'] = generate_next_hub_code(state)

        # 3. Accurate City: strictly preserved as entered by admin
        city = str(data.get('city') or '').strip()
        if not city:
            loc = str(data.get('address') or '').lower()
            if 'hyderabad' in loc:
                city = 'Hyderabad'
            elif 'bengaluru' in loc or 'bangalore' in loc:
                city = 'Bengaluru'
            elif 'vijayawada' in loc:
                city = 'Vijayawada'
            elif 'warangal' in loc:
                city = 'Warangal'
            elif 'chennai' in loc:
                city = 'Chennai'
            elif 'mumbai' in loc:
                city = 'Mumbai'
            else:
                city = 'Hyderabad' if state.lower() in ('telangana', 'telengana') else state
        data['city'] = city

        # 4. Accurate Address & Google Location: generated directly from location/city/state
        loc = str(data.get('address') or data.get('locationAddress') or data.get('location') or '').strip()
        if not loc:
            loc = f"{city}, {state}" if city else state
        data['address'] = loc
        if not data.get('locationAddress'):
            data['locationAddress'] = loc

        if not data.get('googleLocation') and not data.get('google_location') and str(loc).strip():
            import urllib.parse
            data['googleLocation'] = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(str(loc).strip())}"

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
@permission_classes([IsAuthenticated, IsManagerOrReadOnly])
def godown_detail_view(request, pk):
    godown = get_godown_by_id_or_code(pk)
    if not godown:
        return api_error("Godown not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(GodownSerializer(godown).data)

    elif request.method == 'PUT':
        data = request.data.copy()
        if 'erpName' in data and not data.get('name'):
            data['name'] = data['erpName']
        if 'locationAddress' in data and not data.get('address'):
            data['address'] = data['locationAddress']
        if 'ownerName' in data and not data.get('owner_name'):
            data['owner_name'] = data['ownerName']
        elif 'owner_name' in data and not data.get('ownerName'):
            data['ownerName'] = data['owner_name']

        # Check if state is changing
        old_state = godown.state
        new_state = data.get('state', godown.state)
        state_changed = bool(new_state and old_state and str(new_state).strip().lower() != str(old_state).strip().lower())

        # Hub Code: Strictly automated by system (re-calculated if state changes, otherwise preserved)
        if state_changed:
            data['code'] = generate_next_hub_code(str(new_state).strip())
        else:
            data['code'] = godown.code
            
        # Autogenerate googleLocation and address from location/address if not provided
        loc = str(data.get('address') or data.get('locationAddress') or data.get('location') or '').strip()
        if loc:
            data['address'] = loc
            if not data.get('locationAddress'):
                data['locationAddress'] = loc
        if not data.get('googleLocation') and not data.get('google_location') and str(loc).strip():
            import urllib.parse
            data['googleLocation'] = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(str(loc).strip())}"

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

                if state_changed:
                    resequence_hub_codes_for_state(old_state)
                    resequence_hub_codes_for_state(new_state)

            return api_success(GodownSerializer(updated).data)
        return api_error("Validation error", errors=serializer.errors)

    elif request.method == 'DELETE':
        hub_state = godown.state
        released_code = godown.code

        with transaction.atomic():
            # 1. Delete all Finance records (Total Revenue and Monthly Rent entries)
            FinanceTotalRevenue.objects.filter(hub=godown).delete()
            FinanceRent.objects.filter(hub=godown).delete()

            # 2. Delete all operational and ledger data
            HubBroadband.objects.filter(hub=godown).delete()
            RentEntry.objects.filter(godown=godown).delete()
            Expense.objects.filter(godown=godown).delete()
            Asset.objects.filter(godown=godown).delete()

            # 3. Delete hub staff
            Employee.objects.filter(godown=godown).delete()

            # 4. Soft-delete the hub and release the unique code constraint
            import time
            godown.code = f"DELETED_{int(time.time())}_{godown.id}_{released_code}"
            godown.is_deleted = True
            godown.save()

            # 5. Auto-resequence remaining active hubs in this state so codes stay contiguous and updated
            resequence_hub_codes_for_state(hub_state)

        return api_success({
            "message": "Hub and all associated records (finance, rent, assets, staff, and operations) deleted successfully",
            "releasedCode": released_code
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
def reveal_cctv_password_view(request, pk):
    """
    Secure endpoint to reveal decrypted CCTV password.
    Requires:
    1. Authenticated user with ADMIN role.
    2. Admin's own account password verification for zero-leak protection.
    """
    admin_password = request.data.get('adminPassword', '').strip()
    if not admin_password:
        return api_error("Administrator account password is required for verification.", status_code=status.HTTP_400_BAD_REQUEST)

    user = request.user
    pwd_bytes = admin_password.encode('utf-8')
    hash_bytes = user.password_hash.encode('utf-8') if getattr(user, 'password_hash', None) else b''
    if not hash_bytes or not bcrypt.checkpw(pwd_bytes, hash_bytes):
        return api_error("Incorrect administrator password. Access denied.", status_code=status.HTTP_403_FORBIDDEN)

    godown = get_godown_by_id_or_code(pk)
    if not godown:
        return api_error("Hub facility not found", status_code=status.HTTP_404_NOT_FOUND)

    if not godown.cctv_password:
        return api_success({"cctvPassword": ""}, message="No CCTV password configured for this hub")

    decrypted = decrypt_password(godown.cctv_password)
    return api_success({"cctvPassword": decrypted}, message="CCTV password revealed successfully")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def godown_summary_view(request, pk):
    godown = get_godown_by_id_or_code(pk)
    if not godown:
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
@permission_classes([IsAuthenticated, IsAdminRole])
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
        wifi = Decimal(str(data.get('wifi') or '0'))
        manpower = Decimal(str(data.get('manpower') or '0'))
        housekeeping = Decimal(str(data.get('housekeeping') or '0'))
        wm = Decimal(str(data.get('wmRefreshmentPettyCash') or '0'))
        others = Decimal(str(data.get('others') or '0'))
        computed_rev = rent + setup_cost + electricity + wifi + manpower + housekeeping + wm + others
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
@permission_classes([IsAuthenticated, IsAdminRole])
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
        wifi = Decimal(str(data.get('wifi', getattr(obj, 'wifi', 0)) or '0'))
        manpower = Decimal(str(data.get('manpower', obj.manpower) or '0'))
        housekeeping = Decimal(str(data.get('housekeeping', obj.housekeeping) or '0'))
        wm = Decimal(str(data.get('wmRefreshmentPettyCash', obj.wm_refreshment_petty_cash) or '0'))
        others = Decimal(str(data.get('others', getattr(obj, 'others', 0)) or '0'))
        computed_rev = rent + setup_cost + electricity + wifi + manpower + housekeeping + wm + others
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
@permission_classes([IsAuthenticated, IsAdminRole])
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
        # TDS Amount = Rent * 10% (if tdsApplied, else 0)
        # Total Rent After TDS = Rent - TDS Amount
        # GST Amount = Rent * 18% (if gstApplied, else 0)
        # Total Rent Including GST = Total Rent After TDS + GST Amount
        # Total = Total Rent Including GST + Electricity Bill + Sorter Payments + Petty Cash
        rent = Decimal(str(data.get('rent') or '0'))

        raw_tds_applied = data.get('tdsApplied') if 'tdsApplied' in data else data.get('tds_applied')
        tds_applied = str(raw_tds_applied).lower() in ('true', '1') if raw_tds_applied is not None else False

        raw_gst_applied = data.get('gstApplied') if 'gstApplied' in data else data.get('gst_applied')
        gst_applied = str(raw_gst_applied).lower() in ('true', '1') if raw_gst_applied is not None else False

        tds_percent = Decimal(str(data.get('tdsPercent') or '10'))
        if tds_applied:
            tds_amount = (rent * tds_percent) / Decimal('100')
            rent_after_tds = rent - tds_amount
        else:
            tds_amount = Decimal('0')
            rent_after_tds = rent
        
        gst_percent = Decimal(str(data.get('gstPercent') or '18'))
        if gst_applied:
            gst_amount = (rent * gst_percent) / Decimal('100')
            rent_inc_gst = rent_after_tds + gst_amount
        else:
            gst_amount = Decimal('0')
            rent_inc_gst = rent_after_tds
        
        elec_bill = Decimal(str(data.get('electricityBill') or '0'))
        wifi_bill = Decimal(str(data.get('wifiBill') or '0'))
        sorter_pay = Decimal(str(data.get('sorterPayments') or '0'))
        petty_cash = Decimal(str(data.get('pettyCash') or '0'))
        others = Decimal(str(data.get('others') or '0'))
        computed_total = rent_inc_gst + elec_bill + wifi_bill + sorter_pay + petty_cash + others

        data['tdsApplied'] = tds_applied
        data['gstApplied'] = gst_applied
        data['tdsAmount'] = tds_amount
        data['totalRentAfterTds'] = rent_after_tds
        data['gstAmount'] = gst_amount
        data['totalRentIncludingGst'] = rent_inc_gst
        data['electricityBill'] = elec_bill
        data['wifiBill'] = wifi_bill
        data['others'] = others
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
@permission_classes([IsAuthenticated, IsAdminRole])
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

        raw_tds_applied = data.get('tdsApplied') if 'tdsApplied' in data else data.get('tds_applied')
        if raw_tds_applied is not None:
            tds_applied = str(raw_tds_applied).lower() in ('true', '1')
        else:
            tds_applied = bool(getattr(obj, 'tds_applied', False))

        raw_gst_applied = data.get('gstApplied') if 'gstApplied' in data else data.get('gst_applied')
        if raw_gst_applied is not None:
            gst_applied = str(raw_gst_applied).lower() in ('true', '1')
        else:
            gst_applied = bool(getattr(obj, 'gst_applied', False))

        tds_percent = Decimal(str(data.get('tdsPercent', obj.tds_percent) or '10'))
        if tds_applied:
            tds_amount = (rent * tds_percent) / Decimal('100')
            rent_after_tds = rent - tds_amount
        else:
            tds_amount = Decimal('0')
            rent_after_tds = rent
        
        gst_percent = Decimal(str(data.get('gstPercent', obj.gst_percent) or '18'))
        if gst_applied:
            gst_amount = (rent * gst_percent) / Decimal('100')
            rent_inc_gst = rent_after_tds + gst_amount
        else:
            gst_amount = Decimal('0')
            rent_inc_gst = rent_after_tds
        
        elec_bill = Decimal(str(data.get('electricityBill', obj.electricity_bill) or '0'))
        wifi_bill = Decimal(str(data.get('wifiBill', getattr(obj, 'wifi_bill', 0)) or '0'))
        sorter_pay = Decimal(str(data.get('sorterPayments', obj.sorter_payments) or '0'))
        petty_cash = Decimal(str(data.get('pettyCash', obj.petty_cash) or '0'))
        others = Decimal(str(data.get('others', getattr(obj, 'others', 0)) or '0'))
        computed_total = rent_inc_gst + elec_bill + wifi_bill + sorter_pay + petty_cash + others

        data['tdsApplied'] = tds_applied
        data['gstApplied'] = gst_applied
        data['tdsAmount'] = tds_amount
        data['totalRentAfterTds'] = rent_after_tds
        data['gstAmount'] = gst_amount
        data['totalRentIncludingGst'] = rent_inc_gst
        data['electricityBill'] = elec_bill
        data['wifiBill'] = wifi_bill
        data['others'] = others
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
    g = get_godown_by_id_or_code(godown_id)
    target_id = g.id if g else (int(godown_id) if str(godown_id).isdigit() else None)
    if target_id is None:
        return api_success([])
    entries = RentEntry.objects.filter(godown_id=target_id).select_related('godown').order_by('-due_date')
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

            # Dispatch bill notification email alert matching the requested template
            try:
                hub = expense.godown
                hub_name = hub.erp_name or hub.name or (f"{hub.code}" if getattr(hub, 'code', None) else "RGS Hub")
                hub_loc = hub.location_address or hub.address or (f"{hub.city}, {hub.state}" if getattr(hub, 'city', None) else "Hub Location")
                bill_type = expense.title or expense.category or "Operating Bill"
                amount_str = f"{expense.amount:,.2f}" if expense.amount is not None else "0.00"
                pay_status = expense.status or "PENDING"

                send_bill_notification_email(
                    hub_name=hub_name,
                    hub_location=hub_loc,
                    bill_type=bill_type,
                    amount=amount_str,
                    payment_status=pay_status
                )
            except Exception as mail_err:
                print(f"[Bill Notification Alert Failed]: {mail_err}")

            return api_success(ExpenseSerializer(expense).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expenses_by_godown_view(request, godown_id):
    g = get_godown_by_id_or_code(godown_id)
    target_id = g.id if g else (int(godown_id) if str(godown_id).isdigit() else None)
    if target_id is None:
        return api_success([])
    expenses = Expense.objects.filter(godown_id=target_id, is_deleted=False).select_related('godown').order_by('-bill_date')
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
@permission_classes([IsAuthenticated, IsManagerOrReadOnly])
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
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'phoneNumber' in data and not data.get('phone'):
            data['phone'] = data['phoneNumber']
        if 'monthlySalary' in data and not data.get('monthly_salary'):
            data['monthly_salary'] = data['monthlySalary']
        serializer = EmployeeSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            emp = serializer.save()
            return api_success(EmployeeSerializer(emp, context={'request': request}).data, status_code=status.HTTP_201_CREATED)
        return api_error("Validation error", errors=serializer.errors)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsManagerOrReadOnly])
def employee_detail_view(request, pk):
    try:
        emp = Employee.objects.get(pk=pk, is_deleted=False)
    except Employee.DoesNotExist:
        return api_error("Employee not found", status_code=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return api_success(EmployeeSerializer(emp, context={'request': request}).data)
    elif request.method in ('PUT', 'PATCH'):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'phoneNumber' in data and not data.get('phone'):
            data['phone'] = data['phoneNumber']
        if 'monthlySalary' in data and not data.get('monthly_salary'):
            data['monthly_salary'] = data['monthlySalary']
        serializer = EmployeeSerializer(emp, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            emp = serializer.save()
            return api_success(EmployeeSerializer(emp, context={'request': request}).data)
        return api_error("Validation error", errors=serializer.errors)
    elif request.method == 'DELETE':
        emp.is_deleted = True
        emp.save()
        return api_success({"message": "Employee removed successfully"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_godown_view(request, godown_id):
    g = get_godown_by_id_or_code(godown_id)
    target_id = g.id if g else (int(godown_id) if str(godown_id).isdigit() else None)
    if target_id is None:
        return api_success([])
    employees = Employee.objects.filter(godown_id=target_id, is_deleted=False).select_related('godown')
    return api_success(EmployeeSerializer(employees, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminRole])
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
@permission_classes([IsAuthenticated, IsAdminRole])
def salary_payments_by_employee_view(request, employee_id):
    payments = SalaryPayment.objects.filter(employee_id=employee_id).select_related('employee').order_by('-created_at')
    return api_success(SalaryPaymentSerializer(payments, many=True).data)


# ============================================================================
# ASSETS
# ============================================================================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsManagerOrReadOnly])
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
@permission_classes([IsAuthenticated, IsManagerOrReadOnly])
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
    g = get_godown_by_id_or_code(godown_id)
    target_id = g.id if g else (int(godown_id) if str(godown_id).isdigit() else None)
    if target_id is None:
        return api_success([])
    assets = Asset.objects.filter(godown_id=target_id, is_deleted=False).select_related('godown')
    return api_success(AssetSerializer(assets, many=True).data)


# ============================================================================
# DOCUMENTS (FILE STORAGE REMOVED / DISABLED)
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_view(request):
    return api_success([])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_by_godown_view(request, godown_id):
    return api_success([])


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def document_detail_view(request, pk):
    return api_error("File storage has been removed", status_code=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document_view(request):
    return api_error("File storage is not supported", status_code=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# REPORTS
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def reports_summary_view(request):
    year_param = request.GET.get('year')
    current_year = int(year_param) if year_param else timezone.now().year
    year_str = f"{current_year:04d}"

    godowns = Godown.objects.filter(is_deleted=False)
    hub_ids = [h.id for h in godowns]
    
    total_revenue_sum = Decimal('0')
    total_rent_sum = Decimal('0')
    total_setup_cost_sum = Decimal('0')

    now_month_str = timezone.now().strftime('%Y-%m')

    # Bulk pre-fetch revenue for all hubs
    all_revs = FinanceTotalRevenue.objects.filter(hub_id__in=hub_ids).order_by('financial_year', 'id')
    latest_rev_by_hub = {}
    for r in all_revs:
        latest_rev_by_hub[r.hub_id] = {
            'total_revenue': r.total_revenue,
            'setup_cost': r.setup_cost_per_month or Decimal('0')
        }

    # Bulk pre-fetch rent records for now_month
    now_rents = FinanceRent.objects.filter(hub_id__in=hub_ids, period=now_month_str)
    now_rent_by_hub = {r.hub_id: r.total for r in now_rents}

    # Bulk pre-fetch latest rent records as fallback
    latest_rents = FinanceRent.objects.filter(hub_id__in=hub_ids).order_by('period', 'id')
    latest_rent_by_hub = {}
    for r in latest_rents:
        latest_rent_by_hub[r.hub_id] = r.total

    for hub in godowns:
        rev_info = latest_rev_by_hub.get(hub.id)
        if rev_info and rev_info['total_revenue'] is not None:
            hub_revenue = Decimal(str(rev_info['total_revenue']))
            setup_cost = Decimal(str(rev_info['setup_cost']))
        else:
            hub_revenue = Decimal(str(hub.monthly_rent or '0'))
            setup_cost = Decimal('0')
        total_revenue_sum += hub_revenue
        total_setup_cost_sum += setup_cost

        hub_rent = now_rent_by_hub.get(hub.id)
        if hub_rent is None:
            hub_rent = latest_rent_by_hub.get(hub.id)
        if hub_rent is not None:
            hub_rent_val = Decimal(str(hub_rent))
        else:
            hub_rent_val = Decimal(str(hub.monthly_rent or '0'))
        total_rent_sum += hub_rent_val

    total_profit = total_revenue_sum - total_rent_sum
    total_margin = total_profit - total_setup_cost_sum
    margin_percent = round(float((total_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else Decimal('0')), 1)

    # Bulk pre-fetch monthly rent records for the entire target year (1 query instead of 12 * N queries)
    year_prefix = f"{current_year:04d}-"
    year_rents = FinanceRent.objects.filter(hub_id__in=hub_ids, period__startswith=year_prefix)
    rent_by_hub_month = {(r.hub_id, r.period): r.total for r in year_rents}

    # Monthly breakdown for the year
    monthly_data = []
    for m in range(1, 13):
        month_str = f"{current_year:04d}-{m:02d}"
        month_label = datetime.date(current_year, m, 1).strftime('%B')
        
        m_rev = Decimal('0')
        m_rent = Decimal('0')
        for hub in godowns:
            rev_info = latest_rev_by_hub.get(hub.id)
            if rev_info and rev_info['total_revenue'] is not None:
                m_rev += Decimal(str(rev_info['total_revenue']))
            else:
                m_rev += Decimal(str(hub.monthly_rent or '0'))

            f_rent_val = rent_by_hub_month.get((hub.id, month_str))
            if f_rent_val is not None:
                m_rent += Decimal(str(f_rent_val))
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
        "totalRevenue": float(total_revenue_sum),
        "totalRent": float(total_rent_sum),
        "totalProfit": float(total_profit),
        "totalMargin": float(total_margin),
        "marginPercent": margin_percent,
        "monthlyBreakdown": monthly_data,
        # Standard compatibility aliases
        "totalRentalIncome": float(total_revenue_sum),
        "totalExpenses": float(total_rent_sum),
        "totalRentOutflow": float(total_rent_sum),
        "totalOperatingExpenses": float(total_rent_sum),
        "netProfit": float(total_profit),
        "netOperatingIncome": float(total_profit),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def reports_godown_pnl_view(request):
    year_param = request.GET.get('year')
    current_year = int(year_param) if year_param else timezone.now().year
    year_str = f"{current_year:04d}"

    godowns = Godown.objects.filter(is_deleted=False).order_by('name')
    hub_ids = [g.id for g in godowns]
    pnl_list = []
    now_month_str = timezone.now().strftime('%Y-%m')

    # Bulk prefetch revenues
    all_revs = FinanceTotalRevenue.objects.filter(hub_id__in=hub_ids).order_by('financial_year', 'id')
    latest_rev_by_hub = {}
    for r in all_revs:
        latest_rev_by_hub[r.hub_id] = {
            'total_revenue': r.total_revenue,
            'setup_cost': r.setup_cost_per_month or Decimal('0')
        }

    # Bulk prefetch rents for current month and fallback
    now_rents = FinanceRent.objects.filter(hub_id__in=hub_ids, period=now_month_str)
    now_rent_by_hub = {r.hub_id: r.total for r in now_rents}
    latest_rents = FinanceRent.objects.filter(hub_id__in=hub_ids).order_by('period', 'id')
    latest_rent_by_hub = {}
    for r in latest_rents:
        latest_rent_by_hub[r.hub_id] = r.total

    for godown in godowns:
        rev_info = latest_rev_by_hub.get(godown.id)
        if rev_info and rev_info['total_revenue'] is not None:
            hub_rev = Decimal(str(rev_info['total_revenue']))
            setup_cost = Decimal(str(rev_info['setup_cost']))
        else:
            hub_rev = Decimal(str(godown.monthly_rent or '0'))
            setup_cost = Decimal('0')

        rent_val = now_rent_by_hub.get(godown.id)
        if rent_val is None:
            rent_val = latest_rent_by_hub.get(godown.id)
        if rent_val is not None:
            hub_rent = Decimal(str(rent_val))
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
@permission_classes([IsAuthenticated, IsAdminRole])
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
        'Rent', 'Setup Cost/Month', 'Electricity', 'WiFi', 'Manpower', 'Housekeeping', 'WM Refreshment/Petty Cash', 'Others', 'Total Revenue',
        'Rent', 'TDS 10 %', 'TDS Amount', 'Total Rent After TDS', 'GST 18%', 'Total Rent Including GST', 'Electricity Bill', 'WiFi Bill', 'Sorter Payments', 'Petty Cash', 'Others', 'Total',
        'Profit', 'Margin', 'Status'
    ]

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    # Write UTF-8 BOM so Microsoft Excel opens the CSV correctly with proper encoding and symbols
    response.write('\ufeff')

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
        owner = godown.owner_name or godown.lease_contact_name or godown.current_tenant or 'Owner'
        erp_name = godown.erp_name or godown.name or f'Hub #{godown.id}'
        start_date = godown.lease_start_date.isoformat() if godown.lease_start_date else ''
        end_date = godown.lease_end_date.isoformat() if godown.lease_end_date else ''
        tenure = godown.lease_duration_months or ''
        area = float(godown.size_sqft or godown.total_capacity or 0)

        f_rev = FinanceTotalRevenue.objects.filter(hub=godown).order_by('-financial_year', '-id').first()
        rev_rent = float(f_rev.rent) if (f_rev and f_rev.rent is not None) else float(godown.monthly_rent or 0)
        setup_cost = float(f_rev.setup_cost_per_month) if (f_rev and f_rev.setup_cost_per_month is not None) else 0.0
        electricity_rev = float(f_rev.electricity) if (f_rev and f_rev.electricity is not None) else 0.0
        wifi_rev = float(f_rev.wifi) if (f_rev and getattr(f_rev, 'wifi', None) is not None) else 0.0
        manpower = float(f_rev.manpower) if (f_rev and f_rev.manpower is not None) else 0.0
        housekeeping = float(f_rev.housekeeping) if (f_rev and f_rev.housekeeping is not None) else 0.0
        petty_cash_rev = float(f_rev.wm_refreshment_petty_cash) if (f_rev and f_rev.wm_refreshment_petty_cash is not None) else 0.0
        others_rev = float(f_rev.others) if (f_rev and getattr(f_rev, 'others', None) is not None) else 0.0
        total_revenue = float(f_rev.total_revenue) if (f_rev and f_rev.total_revenue is not None) else (rev_rent + setup_cost + electricity_rev + wifi_rev + manpower + housekeeping + petty_cash_rev + others_rev)

        sum_rev_rent = 0.0
        sum_setup_cost = 0.0
        sum_elec_rev = 0.0
        sum_wifi_rev = 0.0
        sum_manpower = 0.0
        sum_housekeeping = 0.0
        sum_petty_rev = 0.0
        sum_others_rev = 0.0
        sum_total_rev = 0.0

        sum_rent_outflow = 0.0
        sum_tds_amt = 0.0
        sum_rent_after_tds = 0.0
        sum_rent_inc_gst = 0.0
        sum_elec_bill = 0.0
        sum_wifi_bill = 0.0
        sum_sorter = 0.0
        sum_petty_rent = 0.0
        sum_others_rent = 0.0
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
                tds_applied = getattr(f_rent, 'tds_applied', None)
                if tds_applied is None:
                    tds_applied = (float(f_rent.tds_amount or 0) > 0)
                
                gst_applied = getattr(f_rent, 'gst_applied', None)
                if gst_applied is None:
                    gst_applied = (float(f_rent.gst_amount or 0) > 0)

                tds_pct = float(f_rent.tds_percent or 10)
                if tds_applied:
                    tds_amt = float(f_rent.tds_amount if f_rent.tds_amount is not None else (rent_val * tds_pct / 100))
                    rent_after_tds = float(f_rent.total_rent_after_tds if f_rent.total_rent_after_tds is not None else (rent_val - tds_amt))
                else:
                    tds_amt = 0.0
                    rent_after_tds = rent_val

                gst_pct = float(f_rent.gst_percent or 18)
                if gst_applied:
                    gst_amt = float(f_rent.gst_amount if f_rent.gst_amount is not None else (rent_val * gst_pct / 100))
                    rent_inc_gst = float(f_rent.total_rent_including_gst if f_rent.total_rent_including_gst is not None else (rent_after_tds + gst_amt))
                else:
                    gst_amt = 0.0
                    rent_inc_gst = rent_after_tds

                electricity_bill = float(f_rent.electricity_bill or 0)
                wifi_bill = float(getattr(f_rent, 'wifi_bill', 0) or 0)
                sorter_payments = float(f_rent.sorter_payments or 0)
                petty_cash_rent = float(f_rent.petty_cash or 0)
                others_rent = float(getattr(f_rent, 'others', 0) or 0)
                total_rent = float(f_rent.total if f_rent.total is not None else (rent_inc_gst + electricity_bill + wifi_bill + sorter_payments + petty_cash_rent + others_rent))

                profit = total_revenue - total_rent
                margin = profit - setup_cost
                status_text = "Done"

                sum_rev_rent += rev_rent
                sum_setup_cost += setup_cost
                sum_elec_rev += electricity_rev
                sum_wifi_rev += wifi_rev
                sum_manpower += manpower
                sum_housekeeping += housekeeping
                sum_petty_rev += petty_cash_rev
                sum_others_rev += others_rev
                sum_total_rev += total_revenue

                sum_rent_outflow += rent_val
                sum_tds_amt += tds_amt
                sum_rent_after_tds += rent_after_tds
                sum_rent_inc_gst += rent_inc_gst
                sum_elec_bill += electricity_bill
                sum_wifi_bill += wifi_bill
                sum_sorter += sorter_payments
                sum_petty_rent += petty_cash_rent
                sum_others_rent += others_rent
                sum_total_rent += total_rent
                sum_profit += profit
                sum_margin += margin

                writer.writerow([
                    month_label, vendor_name, hub_status, state, hub_model, owner, erp_name,
                    start_date, end_date, tenure, area,
                    round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(wifi_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(others_rev, 2), round(total_revenue, 2),
                    round(rent_val, 2), f"{round(tds_pct, 1)}%", round(tds_amt, 2), round(rent_after_tds, 2), f"{round(gst_pct, 1)}%", round(rent_inc_gst, 2), round(electricity_bill, 2), round(wifi_bill, 2), round(sorter_payments, 2), round(petty_cash_rent, 2), round(others_rent, 2), round(total_rent, 2),
                    round(profit, 2), round(margin, 2), status_text
                ])

            # Bottom Total row for entered months
            writer.writerow([
                f'TOTAL ({len(f_rent_records)} Month{"s" if len(f_rent_records) != 1 else ""})', vendor_name, hub_status, state, hub_model, owner, erp_name,
                start_date, end_date, tenure, area,
                round(sum_rev_rent, 2), round(sum_setup_cost, 2), round(sum_elec_rev, 2), round(sum_wifi_rev, 2), round(sum_manpower, 2), round(sum_housekeeping, 2), round(sum_petty_rev, 2), round(sum_others_rev, 2), round(sum_total_rev, 2),
                round(sum_rent_outflow, 2), '', round(sum_tds_amt, 2), round(sum_rent_after_tds, 2), '', round(sum_rent_inc_gst, 2), round(sum_elec_bill, 2), round(sum_wifi_bill, 2), round(sum_sorter, 2), round(sum_petty_rent, 2), round(sum_others_rent, 2), round(sum_total_rent, 2),
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
                    round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(wifi_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(total_revenue, 2),
                    round(rent_val, 2), f"{round(tds_pct, 1)}%", round(tds_amt, 2), round(rent_after_tds, 2), f"{round(gst_pct, 1)}%", round(rent_inc_gst, 2), round(electricity_bill, 2), round(wifi_bill, 2), round(sorter_payments, 2), round(petty_cash_rent, 2), round(total_rent, 2),
                    round(profit, 2), round(margin, 2), status_text
                ])

            writer.writerow([
                f'TOTAL ({len(rent_entries)} Month{"s" if len(rent_entries) != 1 else ""})', vendor_name, hub_status, state, hub_model, owner, erp_name,
                start_date, end_date, tenure, area,
                round(sum_rev_rent, 2), round(sum_setup_cost, 2), round(sum_elec_rev, 2), round(sum_wifi_rev, 2), round(sum_manpower, 2), round(sum_housekeeping, 2), round(sum_petty_rev, 2), round(sum_total_rev, 2),
                round(sum_rent_outflow, 2), '', round(sum_tds_amt, 2), round(sum_rent_after_tds, 2), '', round(sum_rent_inc_gst, 2), round(sum_elec_bill, 2), round(sum_wifi_bill, 2), round(sum_sorter, 2), round(sum_petty_rent, 2), round(sum_total_rent, 2),
                round(sum_profit, 2), round(sum_margin, 2), 'Done'
            ])
        else:
            writer.writerow([
                'No entered monthly records', vendor_name, hub_status, state, hub_model, owner, erp_name,
                start_date, end_date, tenure, area,
                round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(wifi_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(others_rev, 2), round(total_revenue, 2),
                0, '10.0%', 0, 0, '18.0%', 0, 0, 0, 0, 0, 0, 0,
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
    sum_wifi_rev = 0.0
    sum_manpower = 0.0
    sum_housekeeping = 0.0
    sum_petty_rev = 0.0
    sum_others_rev = 0.0
    sum_total_rev = 0.0

    sum_rent_outflow = 0.0
    sum_tds_amt = 0.0
    sum_rent_after_tds = 0.0
    sum_rent_inc_gst = 0.0
    sum_elec_bill = 0.0
    sum_wifi_bill = 0.0
    sum_sorter = 0.0
    sum_petty_rent = 0.0
    sum_others_rent = 0.0
    sum_total_rent = 0.0
    sum_profit = 0.0
    sum_margin = 0.0

    for godown in godowns:
        hub_status = godown.hub_status or godown.status or 'Active'
        state = godown.state or 'ANDHRA PRADESH'
        hub_model = godown.hub_model or 'OSH'
        owner = godown.owner_name or godown.lease_contact_name or godown.current_tenant or 'Owner'
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
        wifi_rev = float(f_rev.wifi) if (f_rev and getattr(f_rev, 'wifi', None) is not None) else 0.0
        manpower = float(f_rev.manpower) if (f_rev and f_rev.manpower is not None) else 0.0
        housekeeping = float(f_rev.housekeeping) if (f_rev and f_rev.housekeeping is not None) else 0.0
        petty_cash_rev = float(f_rev.wm_refreshment_petty_cash) if (f_rev and f_rev.wm_refreshment_petty_cash is not None) else 0.0
        others_rev = float(f_rev.others) if (f_rev and getattr(f_rev, 'others', None) is not None) else 0.0
        total_revenue = float(f_rev.total_revenue) if (f_rev and f_rev.total_revenue is not None) else (rev_rent + setup_cost + electricity_rev + wifi_rev + manpower + housekeeping + petty_cash_rev + others_rev)

        # Rent outflow (current month or latest)
        now_month_str = timezone.now().strftime('%Y-%m')
        f_rent = FinanceRent.objects.filter(hub=godown, period=now_month_str).first()
        if not f_rent:
            f_rent = FinanceRent.objects.filter(hub=godown).order_by('-period', '-id').first()

        if f_rent:
            rent_val = float(f_rent.rent or 0)
            tds_applied = getattr(f_rent, 'tds_applied', None)
            if tds_applied is None:
                tds_applied = (float(f_rent.tds_amount or 0) > 0)
            
            gst_applied = getattr(f_rent, 'gst_applied', None)
            if gst_applied is None:
                gst_applied = (float(f_rent.gst_amount or 0) > 0)

            tds_pct = float(f_rent.tds_percent or 10)
            if tds_applied:
                tds_amt = float(f_rent.tds_amount if f_rent.tds_amount is not None else (rent_val * tds_pct / 100))
                rent_after_tds = float(f_rent.total_rent_after_tds if f_rent.total_rent_after_tds is not None else (rent_val - tds_amt))
            else:
                tds_amt = 0.0
                rent_after_tds = rent_val

            gst_pct = float(f_rent.gst_percent or 18)
            if gst_applied:
                gst_amt = float(f_rent.gst_amount if f_rent.gst_amount is not None else (rent_val * gst_pct / 100))
                rent_inc_gst = float(f_rent.total_rent_including_gst if f_rent.total_rent_including_gst is not None else (rent_after_tds + gst_amt))
            else:
                gst_amt = 0.0
                rent_inc_gst = rent_after_tds

            electricity_bill = float(f_rent.electricity_bill or 0)
            wifi_bill = float(getattr(f_rent, 'wifi_bill', 0) or 0)
            sorter_payments = float(f_rent.sorter_payments or 0)
            petty_cash_rent = float(f_rent.petty_cash or 0)
            others_rent = float(getattr(f_rent, 'others', 0) or 0)
            total_rent = float(f_rent.total if f_rent.total is not None else (rent_inc_gst + electricity_bill + wifi_bill + sorter_payments + petty_cash_rent + others_rent))
        else:
            rent_val = float(godown.monthly_rent or 0)
            tds_pct = 10.0
            tds_amt = 0.0
            rent_after_tds = rent_val
            gst_pct = 18.0
            rent_inc_gst = rent_val
            electricity_bill = 0.0
            wifi_bill = 0.0
            sorter_payments = 0.0
            petty_cash_rent = 0.0
            others_rent = 0.0
            total_rent = rent_val

        profit = total_revenue - total_rent
        margin = profit - setup_cost
        status_text = "Done"

        sum_area += area
        sum_rev_rent += rev_rent
        sum_setup_cost += setup_cost
        sum_elec_rev += electricity_rev
        sum_wifi_rev += wifi_rev
        sum_manpower += manpower
        sum_housekeeping += housekeeping
        sum_petty_rev += petty_cash_rev
        sum_others_rev += others_rev
        sum_total_rev += total_revenue

        sum_rent_outflow += rent_val
        sum_tds_amt += tds_amt
        sum_rent_after_tds += rent_after_tds
        sum_rent_inc_gst += rent_inc_gst
        sum_elec_bill += electricity_bill
        sum_wifi_bill += wifi_bill
        sum_sorter += sorter_payments
        sum_petty_rent += petty_cash_rent
        sum_others_rent += others_rent
        sum_total_rent += total_rent
        sum_profit += profit
        sum_margin += margin

        writer.writerow([
            vendor_name, hub_status, state, hub_model, owner, erp_name,
            start_date, end_date, tenure, area,
            round(rev_rent, 2), round(setup_cost, 2), round(electricity_rev, 2), round(wifi_rev, 2), round(manpower, 2), round(housekeeping, 2), round(petty_cash_rev, 2), round(others_rev, 2), round(total_revenue, 2),
            round(rent_val, 2), f"{round(tds_pct, 1)}%", round(tds_amt, 2), round(rent_after_tds, 2), f"{round(gst_pct, 1)}%", round(rent_inc_gst, 2), round(electricity_bill, 2), round(wifi_bill, 2), round(sorter_payments, 2), round(petty_cash_rent, 2), round(others_rent, 2), round(total_rent, 2),
            round(profit, 2), round(margin, 2), status_text
        ])

    writer.writerow([
        'TOTAL', '', '', '', '', f"{len(godowns)} Hubs",
        '', '', '', round(sum_area, 2),
        round(sum_rev_rent, 2), round(sum_setup_cost, 2), round(sum_elec_rev, 2), round(sum_wifi_rev, 2), round(sum_manpower, 2), round(sum_housekeeping, 2), round(sum_petty_rev, 2), round(sum_others_rev, 2), round(sum_total_rev, 2),
        round(sum_rent_outflow, 2), '', round(sum_tds_amt, 2), round(sum_rent_after_tds, 2), '', round(sum_rent_inc_gst, 2), round(sum_elec_bill, 2), round(sum_wifi_bill, 2), round(sum_sorter, 2), round(sum_petty_rent, 2), round(sum_others_rent, 2), round(sum_total_rent, 2),
        round(sum_profit, 2), round(sum_margin, 2), 'Done'
    ])

    return response


# ============================================================================
# APP SETTINGS
# ============================================================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAdminOrReadOnly])
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


# ============================================================================
# STATELESS DIRECT MAILING (Exclusive to Sai Babu P)
# ============================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_mailing_view(request):
    user = request.user

    # Strict access control: Only Sai Babu P is authorized
    user_email = (getattr(user, 'email', '') or '').strip().lower()
    user_name = (getattr(user, 'username', '') or '').strip().lower()
    full_name = (getattr(user, 'full_name', '') or '').strip().lower()

    is_sai_babu = (
        user_email == 'rgsenterprise2026@gmail.com'
        or 'saibabu' in user_name
        or 'sai babu' in full_name
        or user_name == 'sai babu p'
    )

    if not is_sai_babu:
        return api_error(
            "Access Restricted. Available soon.",
            status_code=status.HTTP_403_FORBIDDEN
        )

    to_email = request.data.get('to', '').strip() or request.data.get('toEmail', '').strip()
    cc_email = request.data.get('cc', '').strip() or request.data.get('ccEmail', '').strip()
    subject = request.data.get('subject', '').strip()
    message = request.data.get('message', '').strip() or request.data.get('body', '').strip()
    attachments = request.data.get('attachments', []) or []
    is_confidential = bool(request.data.get('confidential', False))
    has_signature = bool(request.data.get('signature', True))
    is_urgent = bool(request.data.get('urgent', False) or request.data.get('priority', '') == 'HIGH')

    if not to_email:
        return api_error("Recipient email ('to') is required.")
    if '@' not in to_email or '.' not in to_email:
        return api_error("Please enter a valid recipient email address.")
    if not subject:
        return api_error("Email subject is required.")
    if not message:
        return api_error("Email body content is required.")

    # Optional Confidential Banner
    confidential_html = ""
    if is_confidential:
        confidential_html = """
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">
                🔒 PRIVILEGED & STRICTLY CONFIDENTIAL • INTENDED RECIPIENT ONLY
            </p>
        </div>
        """

    # Optional Urgent Banner
    urgent_banner = ""
    if is_urgent:
        urgent_banner = """
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; text-align: center;">
            <p style="margin: 0; color: #991B1B; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">⚠️ HIGH PRIORITY • URGENT</p>
        </div>
        """

    # Optional Attachments Summary
    attachments_html = ""
    if attachments:
        file_list = ", ".join(att.get('name', 'file') for att in attachments[:10])
        more_count = len(attachments) - 10
        if more_count > 0:
            file_list += f" and {more_count} more"
        attachments_html = f"""
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; margin: 20px 0 24px;">
            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">📎 Attached Documents & Media ({len(attachments)}):</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B;">{file_list}</p>
        </div>
        """

    # Optional Signature Block with Application Logo
    signature_html = ""
    if has_signature:
        rgs_logo_src = "https://raw.githubusercontent.com/yashwanthgalla/rgs_enterprises/main/frontend/public/2.jpeg"
        logo_img_tag = f"""<td style="vertical-align: middle; padding-right: 12px;"><img src="{rgs_logo_src}" alt="RGS Enterprises Logo" style="width: 44px; height: 44px; object-fit: contain; border-radius: 8px; border: 1px solid #E5E7EB; background: #FFFFFF; padding: 2px; display: block;" /></td>"""

        signature_html = f"""
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <table cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #6B7280; line-height: 1.4;">
            <tr>
                {logo_img_tag}
                <td style="vertical-align: middle;">
                    <p style="margin: 0 0 2px; font-weight: 700; color: #111827; font-size: 13px;">Sai Babu P</p>
                    <p style="margin: 0 0 2px; color: #0071E3; font-weight: 600; font-size: 11px;">Managing Director • RGS Enterprises</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 10px;">Warehouse & Facility Management Operations</p>
                </td>
            </tr>
        </table>
        """

    # Formatted professional executive email card (Subject is only in email header, not in message box)
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px;">
        <div style="margin-bottom: 24px; border-bottom: 2px solid #0071E3; padding-bottom: 16px;">
            <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="vertical-align: middle; padding-right: 10px;">
                        <img src="https://raw.githubusercontent.com/yashwanthgalla/rgs_enterprises/main/frontend/public/2.jpeg" alt="Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px; display: block;" />
                    </td>
                    <td style="vertical-align: middle;">
                        <span style="font-size: 15px; font-weight: 800; color: #0071E3; letter-spacing: -0.3px;">RGS ENTERPRISES</span>
                    </td>
                </tr>
            </table>
            <p style="font-size: 11px; color: #6B7280; margin: 6px 0 0 0;">Official Executive Communication • Dispatched by Sai Babu P</p>
        </div>
        {confidential_html}
        {urgent_banner}
        <div style="font-size: 14px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
{message}
        </div>
        {attachments_html}
        {signature_html}
    </div>
    """

    import re
    clean_plain = re.sub(r'<br\s*/?>', '\n', message)
    clean_plain = re.sub(r'</p>', '\n\n', clean_plain)
    clean_plain = re.sub(r'<[^>]+>', '', clean_plain).strip()
    plain_text = clean_plain
    if has_signature:
        plain_text += "\n\nRegards,\nSai Babu P\nManaging Director • RGS Enterprises"

    sent = send_brevo_email(
        to_email=to_email,
        subject=f"{'[URGENT] ' if is_urgent else ''}{subject}",
        html_content=html_content,
        text_content=plain_text,
        attachments=attachments,
        cc=cc_email if cc_email else None
    )

    if not sent:
        return api_error(
            "Failed to dispatch email. Please ensure the recipient email address is valid.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return api_success({
        "delivered": True,
        "recipient": to_email,
        "cc": cc_email or None,
        "subject": subject,
        "attachmentsCount": len(attachments),
        "timestamp": timezone.now().isoformat()
    }, message="Email Sent")

