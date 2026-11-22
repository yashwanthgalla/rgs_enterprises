import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from apps.accounts.models import User


class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION') or (
            request.headers.get('Authorization') if hasattr(request, 'headers') else None
        )
        token = None
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]

        # Support token query parameter (essential for direct browser downloads / exports)
        if not token:
            token = getattr(request, 'query_params', request.GET).get('token')

        if not token:
            return None
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                raise exceptions.AuthenticationFailed('Invalid token payload.')

            user = User.objects.get(id=user_id, is_active=True)
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token.')
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found or inactive.')
