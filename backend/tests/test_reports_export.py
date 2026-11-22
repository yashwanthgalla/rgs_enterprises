import pytest
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from apps.core.models import State
from apps.hubs.models import Hub
from apps.finance.models import RentAgreement


@pytest.mark.django_db
def test_reports_export_csv_total_admin(auth_client_admin):
    client, admin = auth_client_admin
    state = State.objects.create(name='Telangana', code='TS')
    hub = Hub.objects.create(
        code='RGS#TS01',
        code_number=1,
        state=state,
        name='Hyderabad Main Hub',
        total_capacity=15000,
        status='ACTIVE'
    )
    today = timezone.now().date()
    RentAgreement.objects.create(
        hub=hub,
        start_date=today,
        end_date=today + timedelta(days=365),
        monthly_rent=Decimal('75000.00'),
        is_active=True
    )

    url = '/api/v1/reports/export-csv?type=total&year=2026'
    response = client.get(url)
    assert response.status_code == 200
    assert response['Content-Type'].startswith('text/csv')
    assert 'attachment;' in response['Content-Disposition']
    assert 'rgs_all_hubs_financial_report_2026.csv' in response['Content-Disposition']

    # Check UTF-8 BOM and headers
    content = response.content.decode('utf-8-sig')
    assert 'Vendor,Hub Status,State,Hub Model' in content
    assert 'Hyderabad Main Hub' in content


@pytest.mark.django_db
def test_reports_export_csv_single_hub(auth_client_admin):
    client, admin = auth_client_admin
    state = State.objects.create(name='Andhra Pradesh', code='AP')
    hub = Hub.objects.create(
        code='RGS#AP01',
        code_number=1,
        state=state,
        name='Vijayawada Hub',
        total_capacity=8000,
        status='ACTIVE'
    )
    today = timezone.now().date()
    RentAgreement.objects.create(
        hub=hub,
        start_date=today,
        end_date=today + timedelta(days=365),
        monthly_rent=Decimal('50000.00'),
        is_active=True
    )

    url = f'/api/v1/reports/export-csv?type=single&hubId={hub.id}&year=2026'
    response = client.get(url)
    assert response.status_code == 200
    assert 'rgs_Vijayawada_Hub_monthly_2026.csv' in response['Content-Disposition']

    content = response.content.decode('utf-8-sig')
    assert 'Month,Vendor,Hub Status' in content
    assert 'Vijayawada Hub' in content


@pytest.mark.django_db
def test_reports_export_csv_token_query_param(api_client, admin_user):
    import jwt
    from django.conf import settings
    token = jwt.encode({'user_id': admin_user.id}, settings.JWT_SECRET, algorithm='HS256')

    # No Authorization header, only token query parameter
    url = f'/api/v1/reports/export-csv?type=total&token={token}'
    response = api_client.get(url)
    assert response.status_code == 200
    assert response['Content-Type'].startswith('text/csv')


@pytest.mark.django_db
def test_reports_export_csv_unauthenticated_denied(api_client):
    url = '/api/v1/reports/export-csv?type=total'
    response = api_client.get(url)
    assert response.status_code in [401, 403]
