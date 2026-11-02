from django.urls import path
from . import views

urlpatterns = [
    # Health checks
    path('health', views.health_check, name='health_check'),

    # Auth
    path('auth/login', views.login_view, name='login'),
    path('auth/me', views.me_view, name='me'),
    path('auth/profile', views.update_profile_view, name='update_profile'),

    # Dashboard
    path('dashboard/stats', views.dashboard_stats_view, name='dashboard_stats'),
    path('dashboard/reminders', views.dashboard_reminders_view, name='dashboard_reminders'),
    path('dashboard/cashflow-trend', views.dashboard_cashflow_trend_view, name='dashboard_cashflow_trend'),

    # Godowns
    path('godowns', views.godowns_view, name='godowns'),
    path('godowns/all', views.godowns_all_view, name='godowns_all'),
    path('godowns/cities', views.godowns_cities_view, name='godowns_cities'),
    path('godowns/<int:pk>', views.godown_detail_view, name='godown_detail'),
    path('godowns/<int:pk>/summary', views.godown_summary_view, name='godown_summary'),

    # Rent entries
    path('rent-entries', views.rent_entries_view, name='rent_entries'),
    path('rent-entries/godown/<int:godown_id>', views.rent_entries_by_godown_view, name='rent_entries_by_godown'),
    path('rent-entries/<int:pk>', views.rent_entry_detail_view, name='rent_entry_detail'),
    path('rent-entries/<int:pk>/pay', views.record_rent_payment_view, name='record_rent_payment'),

    # Expenses
    path('expenses', views.expenses_view, name='expenses'),
    path('expenses/godown/<int:godown_id>', views.expenses_by_godown_view, name='expenses_by_godown'),
    path('expenses/<int:pk>', views.expense_detail_view, name='expense_detail'),
    path('expenses/<int:pk>/pay', views.record_expense_payment_view, name='record_expense_payment'),

    # Employees & Salaries
    path('employees', views.employees_view, name='employees'),
    path('employees/godown/<int:godown_id>', views.employees_by_godown_view, name='employees_by_godown'),
    path('employees/<int:pk>', views.employee_detail_view, name='employee_detail'),
    path('salary-payments', views.salary_payments_view, name='salary_payments'),
    path('salary-payments/employee/<int:employee_id>', views.salary_payments_by_employee_view, name='salary_payments_by_employee'),

    # Assets
    path('assets', views.assets_view, name='assets'),
    path('assets/godown/<int:godown_id>', views.assets_by_godown_view, name='assets_by_godown'),
    path('assets/<int:pk>', views.asset_detail_view, name='asset_detail'),

    # Documents
    path('documents', views.documents_view, name='documents'),
    path('documents/godown/<int:godown_id>', views.documents_by_godown_view, name='documents_by_godown'),
    path('documents/<int:pk>', views.document_detail_view, name='document_detail'),
    path('documents/upload', views.upload_document_view, name='upload_document'),

    # Reports
    path('reports/summary', views.reports_summary_view, name='reports_summary'),
    path('reports/godown-pnl', views.reports_godown_pnl_view, name='reports_godown_pnl'),
    path('reports/export-csv', views.reports_export_csv_view, name='reports_export_csv'),

    # Settings
    path('settings', views.settings_view, name='settings'),
]

