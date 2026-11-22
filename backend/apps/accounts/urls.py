from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.accounts.views import (
    LoginView, SendOtpView, VerifyOtpView, UserViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login-noslash'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('forgot-password/send-otp', SendOtpView.as_view(), name='auth-send-otp-noslash'),
    path('forgot-password/send-otp/', SendOtpView.as_view(), name='auth-send-otp'),
    path('forgot-password/verify', VerifyOtpView.as_view(), name='auth-verify-otp-noslash'),
    path('forgot-password/verify/', VerifyOtpView.as_view(), name='auth-verify-otp'),
    path('', include(router.urls)),
]
