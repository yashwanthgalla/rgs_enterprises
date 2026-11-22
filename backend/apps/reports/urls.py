from django.urls import path
from apps.reports.views import ReportsExportCsvView

urlpatterns = [
    path('export-csv', ReportsExportCsvView.as_view(), name='reports-export-csv'),
    path('export-csv/', ReportsExportCsvView.as_view(), name='reports-export-csv-slash'),
]
