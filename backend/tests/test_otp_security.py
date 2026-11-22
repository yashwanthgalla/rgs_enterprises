import pytest
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounts.services.otp_service import create_otp_session, verify_and_consume_otp


@pytest.mark.django_db
def test_otp_successful_verification(admin_user):
    jti, raw_otp, session = create_otp_session(admin_user)
    verified_user = verify_and_consume_otp(jti, raw_otp)
    assert verified_user.id == admin_user.id

    session.refresh_from_db()
    assert session.consumed_at is not None


@pytest.mark.django_db
def test_otp_replay_attack_prevention(admin_user):
    jti, raw_otp, _ = create_otp_session(admin_user)
    # First consumption succeeds
    verify_and_consume_otp(jti, raw_otp)

    # Replay attack: attempting to reuse the same JTI and OTP must fail
    with pytest.raises(ValidationError, match="already been used"):
        verify_and_consume_otp(jti, raw_otp)


@pytest.mark.django_db
def test_otp_max_attempts_lockout(admin_user):
    jti, raw_otp, session = create_otp_session(admin_user)

    # Attempt 1 wrong
    with pytest.raises(ValidationError, match="2 attempt"):
        verify_and_consume_otp(jti, "000000")

    # Attempt 2 wrong
    with pytest.raises(ValidationError, match="1 attempt"):
        verify_and_consume_otp(jti, "000000")

    # Attempt 3 wrong -> session locked
    with pytest.raises(ValidationError, match="0 attempt"):
        verify_and_consume_otp(jti, "000000")

    # Even with the CORRECT OTP now, attempt must be rejected because max attempts exceeded
    with pytest.raises(ValidationError, match="Maximum verification attempts exceeded"):
        verify_and_consume_otp(jti, raw_otp)


@pytest.mark.django_db
def test_otp_expiry_enforcement(admin_user):
    jti, raw_otp, session = create_otp_session(admin_user)
    # Fast forward session expiry
    session.expires_at = timezone.now() - timedelta(minutes=1)
    session.save(update_fields=['expires_at'])

    with pytest.raises(ValidationError, match="OTP has expired"):
        verify_and_consume_otp(jti, raw_otp)
