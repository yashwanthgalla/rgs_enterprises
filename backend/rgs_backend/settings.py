import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-rgs-enterprises-secret-key-prod-2026!')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'rgs_backend.urls'
APPEND_SLASH = False

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'rgs_backend.wsgi.application'

# Database Configuration (Supabase PostgreSQL / SQLite)
DB_ENGINE = os.getenv('DB_ENGINE', 'postgresql').lower()
DATABASE_URL = os.getenv('DATABASE_URL')

if DB_ENGINE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif DATABASE_URL:
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/') or 'postgres',
            'USER': urllib.parse.unquote(parsed.username or 'postgres'),
            'PASSWORD': urllib.parse.unquote(parsed.password or ''),
            'HOST': parsed.hostname,
            'PORT': str(parsed.port or 5432),
            'CONN_MAX_AGE': 0,  # Recommended by Supabase pooler: close connection after request to prevent idle TCP reset
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'sslmode': 'require',
                'connect_timeout': 10,
                'keepalives': 1,
                'keepalives_idle': 30,
                'keepalives_interval': 10,
                'keepalives_count': 5,
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'postgres'),
            'USER': os.getenv('DB_USER', 'postgres.gsnnpzbzdevsuupywwco'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'RGS@Enterprisesp5'),
            'HOST': os.getenv('DB_HOST', 'aws-0-ap-southeast-2.pooler.supabase.com'),
            'PORT': os.getenv('DB_PORT', '5432'),
            'CONN_MAX_AGE': 0,
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'sslmode': 'require',
                'connect_timeout': 10,
                'keepalives': 1,
                'keepalives_idle': 30,
                'keepalives_interval': 10,
                'keepalives_count': 5,
            },
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Upload Size Limits (Up to 50MB for rich mailing attachments, folders & media)
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

cors_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_env.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'https://rgsenterprise.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
    ]

CSRF_TRUSTED_ORIGINS = [
    'https://rgsenterprise.vercel.app',
    'https://rgsenterprises-backend-two.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
]

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'api.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'UNAUTHENTICATED_USER': None,
}

# JWT Settings
JWT_SECRET = os.getenv('JWT_SECRET', '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970')
JWT_EXPIRATION_MS = int(os.getenv('JWT_EXPIRATION_MS', '86400000'))

# Supabase Storage Settings
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://ekkoeycylhhxykepbikl.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', 'sb_publishable_eUvog9Tlihv-uPTvLV6LGQ_tRRLHMNQ')
STORAGE_BUCKET = os.getenv('STORAGE_BUCKET', 'godown-documents')

# Brevo Mail Settings
BREVO_API_KEY = os.getenv('BREVO_API_KEY', '')
BREVO_SMTP_KEY = os.getenv('BREVO_SMTP_KEY', '')
BREVO_SMTP_USER = os.getenv('BREVO_SMTP_USER', 'c106ae001@smtp-brevo.com')
BREVO_SMTP_HOST = os.getenv('BREVO_SMTP_HOST', 'smtp-relay.brevo.com')
BREVO_SMTP_PORT = int(os.getenv('BREVO_SMTP_PORT', 587))
BREVO_SENDER_EMAIL = os.getenv('BREVO_SENDER_EMAIL', 'nagayashwanthgalla@outlook.com')
BREVO_SENDER_NAME = os.getenv('BREVO_SENDER_NAME', 'RGS Enterprises')

# Django Email Backend (Powered by Brevo SMTP)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = BREVO_SMTP_HOST
EMAIL_PORT = BREVO_SMTP_PORT
EMAIL_USE_TLS = True
EMAIL_HOST_USER = BREVO_SMTP_USER
EMAIL_HOST_PASSWORD = BREVO_SMTP_KEY
DEFAULT_FROM_EMAIL = f"{BREVO_SENDER_NAME} <{BREVO_SENDER_EMAIL}>"

BILLING_ALERT_EMAIL = os.getenv('BILLING_ALERT_EMAIL', 'rgsenterprise2026@gmail.com')
ALLOWED_RESET_EMAILS = [
    e.strip().lower()
    for e in os.getenv(
        'ALLOWED_RESET_EMAILS',
        'rgsenterprise2026@gmail.com,bschandrasekhar4@gmail.com,gprabhakar024@gmail.com,nagayashwanthgalla@gmail.com'
    ).split(',')
    if e.strip()
]
