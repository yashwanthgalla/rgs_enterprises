import pytest
from rest_framework import status
from django.core.exceptions import PermissionDenied
from apps.hubs.models import Hub, HubCCTVCredential
from apps.hubs.services.cctv_crypto_service import (
    encrypt_cctv_password, decrypt_cctv_password, reveal_cctv_credentials
)
from apps.audit.models import AuditLog, AuditAction


@pytest.mark.django_db
def test_cctv_fernet_encryption_roundtrip():
    secret = "TopSecretNVR2026!"
    ciphertext = encrypt_cctv_password(secret)
    assert ciphertext != secret
    plaintext = decrypt_cctv_password(ciphertext)
    assert plaintext == secret


@pytest.mark.django_db
def test_cctv_reveal_password_challenge_success(admin_user, state_ap):
    hub = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="H1", city="C1", created_by=admin_user)
    raw_pass = "CameraAccess@999"
    HubCCTVCredential.objects.create(
        hub=hub,
        username="admin",
        password_encrypted=encrypt_cctv_password(raw_pass),
        access_url="http://192.168.1.108:8000",
        created_by=admin_user
    )

    # Valid admin password
    res = reveal_cctv_credentials(hub, admin_user, "AdminPass@123", ip_address="127.0.0.1", user_agent="Pytest")
    assert res["password"] == raw_pass
    assert res["username"] == "admin"

    # Verify audit log recorded
    log = AuditLog.objects.filter(action=AuditAction.CCTV_REVEAL, target_id=hub.cctv.id).first()
    assert log is not None
    assert log.hub_code_snapshot == "RGS#AP01"
    assert log.user == admin_user


@pytest.mark.django_db
def test_cctv_reveal_wrong_password_denied(admin_user, state_ap):
    hub = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="H1", city="C1", created_by=admin_user)
    HubCCTVCredential.objects.create(
        hub=hub,
        username="admin",
        password_encrypted=encrypt_cctv_password("Pass"),
        created_by=admin_user
    )

    with pytest.raises(PermissionDenied, match="Security check failed"):
        reveal_cctv_credentials(hub, admin_user, "WrongPassword@000")


@pytest.mark.django_db
def test_cctv_reveal_non_admin_denied(manager_user, state_ap, admin_user):
    hub = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="H1", city="C1", created_by=admin_user)
    HubCCTVCredential.objects.create(
        hub=hub,
        username="admin",
        password_encrypted=encrypt_cctv_password("Pass"),
        created_by=admin_user
    )

    with pytest.raises(PermissionDenied, match="Only Administrators"):
        reveal_cctv_credentials(hub, manager_user, "ManagerPass@123")
