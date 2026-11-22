from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # All API endpoints strictly versioned under /api/v1/
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/hubs/', include('apps.hubs.urls')),
    path('api/v1/finance/', include('apps.finance.urls')),
    path('api/v1/hr/', include('apps.hr.urls')),
    path('api/v1/assets/', include('apps.assets.urls')),
    path('api/v1/documents/', include('apps.documents.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
    path('api/v1/alerts/', include('apps.alerts.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
]
