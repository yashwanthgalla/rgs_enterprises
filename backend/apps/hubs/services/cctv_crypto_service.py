import os
from typing import Dict, Any
from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.audit.models import AuditLog, AuditAction, AuditDomain
from apps.hubs.models import Hub, HubCCTVCredential


def get_fernet_instance() -> Fernet:
    key = getattr(settings, 'FERNET_KEY', None) or os.environ.get('FERNET_KEY')
    if not key:
        # Fallback for dev/testing only
        key = b'Vv1b37ZJqgQ7K5f09e2O5-N7N8q2jR6_lU0Z2p8n4W8='
    if isinstance(key, str):
        key = key.encode('utf-8')
    return Fernet(key)


def encrypt_cctv_password(raw_password: str) -> str:
    if not raw_password:
        return ""
    f = get_fernet_instance()
    return f.encrypt(raw_password.encode('utf-8')).decode('utf-8')


def decrypt_cctv_password(encrypted_ciphertext: str) -> str:
    if not encrypted_ciphertext:
        return ""
    f = get_fernet_instance()
    return f.decrypt(encrypted_ciphertext.encode('utf-8')).decode('utf-8')


def reveal_cctv_credentials(
    hub: Hub,
    request_user: User,
    admin_password: str,
    ip_address: str = None,
    user_agent: str = None
) -> Dict[str, Any]:
    """
    Reveals CCTV credentials for a Hub after strict admin password challenge.
    Emits an immutable AuditLog entry snapshotting Hub metadata.
    """
    if not request_user or not request_user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    if request_user.role != UserRole.ADMIN:
        raise PermissionDenied("Only Administrators can request CCTV password reveal.")

    if not request_user.check_password(admin_password):
        raise PermissionDenied("Invalid administrator password. Security check failed.")

    try:
        cctv = hub.cctv
    except HubCCTVCredential.DoesNotExist:
        raise ValidationError(f"No CCTV credentials configured for Hub {hub.code}.")

    decrypted_pass = decrypt_cctv_password(cctv.password_encrypted)

    # Record security audit event
    AuditLog.objects.create(
        user=request_user,
        action=AuditAction.CCTV_REVEAL,
        domain=AuditDomain.HUBS,
        target_table='hubs_cctv_credentials',
        target_id=cctv.id,
        hub_code_snapshot=hub.code,
        hub_name_snapshot=hub.name,
        ip_address=ip_address,
        user_agent=user_agent,
        new_values={'revealed_username': cctv.username},
        timestamp=timezone.now()
    )

    return {
        "username": cctv.username,
        "password": decrypted_pass,
        "access_url": cctv.access_url,
        "revealed_at": timezone.now().isoformat()
    }
