import bcrypt
from django.db import models
from django.utils import timezone
from apps.core.models import TimeStampedModel


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrator'
    MANAGER = 'MANAGER', 'Manager'
    VIEWER = 'VIEWER', 'Viewer'


class User(TimeStampedModel):
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    full_name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=20, null=True, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.ADMIN)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='users_created'
    )

    class Meta:
        db_table = 'accounts_users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.email}) - {self.role}"

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_manager(self):
        return self.role in (UserRole.ADMIN, UserRole.MANAGER)

    def set_password(self, raw_password: str):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(raw_password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, raw_password: str) -> bool:
        if not self.password_hash:
            return False
        try:
            return bcrypt.checkpw(raw_password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except Exception:
            return False


class OtpPurpose(models.TextChoices):
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
    CCTV_VERIFY = 'CCTV_VERIFY', 'CCTV Verification'


class OtpSession(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='otp_sessions')
    jti_hash = models.CharField(max_length=64, unique=True, db_index=True)
    otp_hash = models.CharField(max_length=128)
    purpose = models.CharField(max_length=30, choices=OtpPurpose.choices, default=OtpPurpose.PASSWORD_RESET)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_otp_sessions'

    def is_valid(self) -> bool:
        return (
            self.consumed_at is None and
            self.attempts < self.max_attempts and
            timezone.now() < self.expires_at
        )
