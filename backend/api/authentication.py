import jwt
from django.conf import settings
from django.db.models import Q
from rest_framework import authentication, exceptions
from .models import AppUser


class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        raw_token = None
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                raw_token = parts[1]

        # Support token query parameter (essential for direct browser downloads / exports)
        if not raw_token:
            raw_token = getattr(request, 'query_params', request.GET).get('token')

        if not raw_token:
            return None
        try:
            payload = jwt.decode(
                raw_token,
                settings.JWT_SECRET,
                algorithms=['HS256', 'HS384', 'HS512'],
                options={'verify_exp': True}
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.PyJWTError:
            raise exceptions.AuthenticationFailed('Invalid token')

        username = payload.get('sub') or payload.get('username')
        if not username:
            raise exceptions.AuthenticationFailed('Invalid token payload')

        user = AppUser.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()
        if not user:
            raise exceptions.AuthenticationFailed('User not found')

        user.is_authenticated = True
        return (user, raw_token)

