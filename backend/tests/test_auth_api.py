import pytest
from rest_framework import status


@pytest.mark.django_db
def test_login_success(api_client, admin_user):
    res = api_client.post("/api/v1/auth/login/", {
        "email": admin_user.email,
        "password": "AdminPass@123"
    }, format="json")
    assert res.status_code == status.HTTP_200_OK
    assert "token" in res.data
    assert res.data["user"]["email"] == admin_user.email
    assert res.data["user"]["role"] == "ADMIN"


@pytest.mark.django_db
def test_login_invalid_password(api_client, admin_user):
    res = api_client.post("/api/v1/auth/login/", {
        "email": admin_user.email,
        "password": "WrongPassword"
    }, format="json")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_login_deactivated_user(api_client, admin_user):
    admin_user.is_active = False
    admin_user.save()

    res = api_client.post("/api/v1/auth/login/", {
        "email": admin_user.email,
        "password": "AdminPass@123"
    }, format="json")
    assert res.status_code == status.HTTP_403_FORBIDDEN
