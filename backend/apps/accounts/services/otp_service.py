import uuid
import hashlib
import random
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounts.models import User, OtpSession, OtpPurpose


def hash_string(val: str) -> str:
    return hashlib.sha256(val.encode('utf-8')).hexdigest()


def create_otp_session(user: User, purpose: str = OtpPurpose.PASSWORD_RESET, expiry_minutes: int = 10) -> tuple:
    """
    Creates a single-use OTP session. Returns (jti, raw_otp).
    Only hashes are stored in the database.
    """
    raw_jti = str(uuid.uuid4())
    raw_otp = f"{random.randint(100000, 999999):06d}"

    jti_hash = hash_string(raw_jti)
    otp_hash = hash_string(f"{raw_otp}:{raw_jti}")

    expires_at = timezone.now() + timedelta(minutes=expiry_minutes)

    session = OtpSession.objects.create(
        user=user,
        jti_hash=jti_hash,
        otp_hash=otp_hash,
        purpose=purpose,
        expires_at=expires_at
    )
    return raw_jti, raw_otp, session


def verify_and_consume_otp(raw_jti: str, raw_otp: str, purpose: str = OtpPurpose.PASSWORD_RESET) -> User:
    """
    Verifies the provided OTP against the single-use session.
    Increments attempt counters on failure, rejects replayed or expired tokens.
    """
    jti_hash = hash_string(raw_jti)
    try:
        session = OtpSession.objects.get(jti_hash=jti_hash, purpose=purpose)
    except OtpSession.DoesNotExist:
        raise ValidationError("Invalid or non-existent OTP session.")

    if session.consumed_at is not None:
        raise ValidationError("This OTP has already been used and cannot be replayed.")

    if timezone.now() > session.expires_at:
        raise ValidationError("OTP has expired. Please request a new code.")

    if session.attempts >= session.max_attempts:
        raise ValidationError("Maximum verification attempts exceeded. Session locked.")

    expected_hash = hash_string(f"{raw_otp.strip()}:{raw_jti}")
    if session.otp_hash != expected_hash:
        session.attempts += 1
        session.save(update_fields=['attempts'])
        remaining = session.max_attempts - session.attempts
        raise ValidationError(f"Invalid OTP code. {remaining} attempt(s) remaining.")

    # Mark as consumed immediately
    session.consumed_at = timezone.now()
    session.save(update_fields=['consumed_at'])

    return session.user
