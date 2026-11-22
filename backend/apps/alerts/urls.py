from django.urls import path
from apps.alerts.views import ActiveAlertsView

urlpatterns = [
    path('', ActiveAlertsView.as_view(), name='active-alerts'),
]
