from django.urls import path
from . import views

urlpatterns = [
    # Health checks
    path('health', views.health_check, name='health_check'),

    # Auth
    path('auth/login', views.login_view, name='login'),
    path('auth/me', views.me_view, name='me'),
    path('auth/profile', views.update_profile_view, name='update_profile'),
    path('auth/check-username', views.check_username_view, name='check_username'),
    path('auth/forgot-password/send-otp', views.send_forgot_password_otp_view, name='forgot_password_send_otp'),
    path('auth/forgot-password/verify-reset', views.verify_otp_and_reset_password_view, name='forgot_password_verify_reset'),
    path('auth/copy-otp', views.copy_otp_redirect_view, name='copy_otp_redirect'),
    path('auth/copy-otp/', views.copy_otp_redirect_view, name='copy_otp_redirect_slash'),

    # Dashboard
    path('dashboard/stats', views.dashboard_stats_view, name='dashboard_stats'),
    path('dashboard/reminders', views.dashboard_reminders_view, name='dashboard_reminders'),
    path('dashboard/cashflow-trend', views.dashboard_cashflow_trend_view, name='dashboard_cashflow_trend'),

    # Hubs & Godowns (Supporting both /hubs and /godowns with & without trailing slash)
    path('hubs', views.godowns_view, name='hubs'),
    path('hubs/', views.godowns_view, name='hubs_slash'),
    path('hubs/all', views.godowns_all_view, name='hubs_all'),
    path('hubs/all/', views.godowns_all_view, name='hubs_all_slash'),
    path('hubs/cities', views.godowns_cities_view, name='hubs_cities'),
    path('hubs/cities/', views.godowns_cities_view, name='hubs_cities_slash'),
    path('hubs/next-code', views.next_godown_code_view, name='next_hub_code'),
    path('hubs/next-code/', views.next_godown_code_view, name='next_hub_code_slash'),
    path('hubs/<str:pk>', views.godown_detail_view, name='hub_detail'),
    path('hubs/<str:pk>/', views.godown_detail_view, name='hub_detail_slash'),
    path('hubs/<str:pk>/reveal-cctv-password', views.reveal_cctv_password_view, name='reveal_hub_cctv_password'),
    path('hubs/<str:pk>/reveal-cctv-password/', views.reveal_cctv_password_view, name='reveal_hub_cctv_password_slash'),
    path('hubs/<str:pk>/summary', views.godown_summary_view, name='hub_summary'),
    path('hubs/<str:pk>/summary/', views.godown_summary_view, name='hub_summary_slash'),

    # Legacy Godowns routes for backward compatibility
    path('godowns', views.godowns_view, name='godowns'),
    path('godowns/', views.godowns_view, name='godowns_slash'),
    path('godowns/all', views.godowns_all_view, name='godowns_all'),
    path('godowns/all/', views.godowns_all_view, name='godowns_all_slash'),
    path('godowns/cities', views.godowns_cities_view, name='godowns_cities'),
    path('godowns/cities/', views.godowns_cities_view, name='godowns_cities_slash'),
    path('godowns/next-code', views.next_godown_code_view, name='next_godown_code'),
    path('godowns/next-code/', views.next_godown_code_view, name='next_godown_code_slash'),
    path('godowns/<str:pk>', views.godown_detail_view, name='godown_detail'),
    path('godowns/<str:pk>/', views.godown_detail_view, name='godown_detail_slash'),
    path('godowns/<str:pk>/reveal-cctv-password', views.reveal_cctv_password_view, name='reveal_cctv_password'),
    path('godowns/<str:pk>/reveal-cctv-password/', views.reveal_cctv_password_view, name='reveal_cctv_password_slash'),
    path('godowns/<str:pk>/summary', views.godown_summary_view, name='godown_summary'),
    path('godowns/<str:pk>/summary/', views.godown_summary_view, name='godown_summary_slash'),

    # Broadband
    path('hub-broadband', views.hub_broadband_view, name='hub_broadband'),
    path('hub-broadband/<int:pk>', views.hub_broadband_detail_view, name='hub_broadband_detail'),

    # Finance Module
    path('finance/total-revenue', views.finance_total_revenue_view, name='finance_total_revenue'),
    path('finance/total-revenue/<int:pk>', views.finance_total_revenue_detail_view, name='finance_total_revenue_detail'),
    path('finance/rent', views.finance_rent_view, name='finance_rent'),
    path('finance/rent/<int:pk>', views.finance_rent_detail_view, name='finance_rent_detail'),

    # Rent entries
    path('rent-entries', views.rent_entries_view, name='rent_entries'),
    path('rent-entries/', views.rent_entries_view, name='rent_entries_slash'),
    path('rent-entries/hub/<str:godown_id>', views.rent_entries_by_godown_view, name='rent_entries_by_hub'),
    path('rent-entries/godown/<str:godown_id>', views.rent_entries_by_godown_view, name='rent_entries_by_godown'),
    path('rent-entries/<int:pk>', views.rent_entry_detail_view, name='rent_entry_detail'),
    path('rent-entries/<int:pk>/pay', views.record_rent_payment_view, name='record_rent_payment'),

    # Expenses
    path('expenses', views.expenses_view, name='expenses'),
    path('expenses/', views.expenses_view, name='expenses_slash'),
    path('expenses/hub/<str:godown_id>', views.expenses_by_godown_view, name='expenses_by_hub'),
    path('expenses/godown/<str:godown_id>', views.expenses_by_godown_view, name='expenses_by_godown'),
    path('expenses/<int:pk>', views.expense_detail_view, name='expense_detail'),
    path('expenses/<int:pk>/pay', views.record_expense_payment_view, name='record_expense_payment'),

    # Employees & Salaries
    path('employees', views.employees_view, name='employees'),
    path('employees/', views.employees_view, name='employees_slash'),
    path('employees/hub/<str:godown_id>', views.employees_by_godown_view, name='employees_by_hub'),
    path('employees/godown/<str:godown_id>', views.employees_by_godown_view, name='employees_by_godown'),
    path('employees/<int:pk>', views.employee_detail_view, name='employee_detail'),
    path('salary-payments', views.salary_payments_view, name='salary_payments'),
    path('salary-payments/', views.salary_payments_view, name='salary_payments_slash'),
    path('salary-payments/employee/<int:employee_id>', views.salary_payments_by_employee_view, name='salary_payments_by_employee'),

    # Assets
    path('assets', views.assets_view, name='assets'),
    path('assets/', views.assets_view, name='assets_slash'),
    path('assets/hub/<str:godown_id>', views.assets_by_godown_view, name='assets_by_hub'),
    path('assets/godown/<str:godown_id>', views.assets_by_godown_view, name='assets_by_godown'),
    path('assets/<int:pk>', views.asset_detail_view, name='asset_detail'),

    # Documents
    path('documents', views.documents_view, name='documents'),
    path('documents/', views.documents_view, name='documents_slash'),
    path('documents/hub/<str:godown_id>', views.documents_by_godown_view, name='documents_by_hub'),
    path('documents/godown/<str:godown_id>', views.documents_by_godown_view, name='documents_by_godown'),
    path('documents/<int:pk>', views.document_detail_view, name='document_detail'),
    path('documents/upload', views.upload_document_view, name='upload_document'),

    # Reports
    path('reports/summary', views.reports_summary_view, name='reports_summary'),
    path('reports/godown-pnl', views.reports_godown_pnl_view, name='reports_godown_pnl'),
    path('reports/export-csv', views.reports_export_csv_view, name='reports_export_csv'),

    # Settings
    path('settings', views.settings_view, name='settings'),
    path('settings/', views.settings_view, name='settings_slash'),

    # Direct Stateless Mailing (Exclusive to Sai Babu P)
    path('mailing/send', views.send_mailing_view, name='send_mailing'),
    path('mailing/send/', views.send_mailing_view, name='send_mailing_slash'),
]

