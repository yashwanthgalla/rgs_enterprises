import pytest
import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole
from apps.core.models import State


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def state_ap(db):
    state, _ = State.objects.get_or_create(code="AP", defaults={"name": "Andhra Pradesh"})
    return state


@pytest.fixture
def state_ts(db):
    state, _ = State.objects.get_or_create(code="TS", defaults={"name": "Telangana"})
    return state


@pytest.fixture
def admin_user(db):
    user = User(
        email="admin@rgsenterprises.internal",
        full_name="Admin User",
        role=UserRole.ADMIN,
        is_active=True
    )
    user.set_password("AdminPass@123")
    user.save()
    return user


@pytest.fixture
def manager_user(db):
    user = User(
        email="manager@rgsenterprises.internal",
        full_name="Manager User",
        role=UserRole.MANAGER,
        is_active=True
    )
    user.set_password("ManagerPass@123")
    user.save()
    return user


@pytest.fixture
def viewer_user(db):
    user = User(
        email="viewer@rgsenterprises.internal",
        full_name="Viewer User",
        role=UserRole.VIEWER,
        is_active=True
    )
    user.set_password("ViewerPass@123")
    user.save()
    return user


def get_jwt_token(user):
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')


@pytest.fixture
def auth_client_admin(admin_user):
    client = APIClient()
    token = get_jwt_token(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client, admin_user


@pytest.fixture
def auth_client_manager(manager_user):
    client = APIClient()
    token = get_jwt_token(manager_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client, manager_user


@pytest.fixture
def auth_client_viewer(viewer_user):
    client = APIClient()
    token = get_jwt_token(viewer_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client, viewer_user
