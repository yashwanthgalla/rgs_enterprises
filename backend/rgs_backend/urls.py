from django.contrib import admin
from django.urls import path, include
from api.views import health_check, root_view

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('actuator/health', health_check),
    path('health', health_check),
    path('api/', include('api.urls')),
    path('api/v1/', include('api.urls')),
]
