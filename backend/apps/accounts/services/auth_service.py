import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from apps.accounts.models import User


def generate_jwt_token(user: User) -> str:
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'full_name': user.full_name,
        'exp': datetime.now(timezone.utc) + timedelta(hours=getattr(settings, 'JWT_EXPIRATION_HOURS', 24))
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')
