import os
import urllib.parse
from config.settings.base import *

DEBUG = False

# Allowed hosts in production
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', '.vercel.app').split(',') if h.strip()]

# Strict CORS configuration
cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_origins:
    CORS_ALLOWED_ORIGINS = [orig.strip() for orig in cors_origins.split(',') if orig.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    # Allow Vercel preview and production subdomains by default
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

# HTTPS & Proxy headers for Vercel Serverless
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'

# ==============================================================================
# VERCEL SERVERLESS & SUPABASE CONNECTION POOLER CONFIGURATION
# ==============================================================================
# In a serverless environment (AWS Lambda/Vercel), requests run inside transient,
# autoscaling micro-containers. If CONN_MAX_AGE > 0, connections linger and quickly
# exhaust the Supabase connection pool limits.
#
# Rules:
# 1. CONN_MAX_AGE = 0 forces Django to close the connection immediately upon
#    request completion.
# 2. DISABLE_SERVER_SIDE_CURSORS = True is mandatory when connecting via Supabase
#    Transaction Pooler (port 6543) or Session Pooler (port 5432) to avoid cursor state errors.
# ==============================================================================

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is missing in production environment!")

parsed = urllib.parse.urlparse(DATABASE_URL)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': parsed.path.lstrip('/') or 'postgres',
        'USER': parsed.username,
        'PASSWORD': urllib.parse.unquote(parsed.password or ''),
        'HOST': parsed.hostname,
        'PORT': parsed.port or 5432,
        'CONN_MAX_AGE': 0,  # Critical for Vercel Serverless
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 10,
        },
        'DISABLE_SERVER_SIDE_CURSORS': True,  # Required for Supabase transaction/session poolers
    }
}
