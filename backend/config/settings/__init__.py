import os

environment = os.getenv('DJANGO_ENV', 'development').lower()
if os.getenv('VERCEL') == '1' or environment == 'production':
    from config.settings.production import *
else:
    from config.settings.development import *
