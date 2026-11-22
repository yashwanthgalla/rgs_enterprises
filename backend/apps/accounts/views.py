from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from apps.accounts.models import User, UserRole
from apps.accounts.permissions import IsAdminUserRole
from apps.accounts.serializers import (
    UserSerializer, LoginRequestSerializer, LoginResponseSerializer,
    SendOtpRequestSerializer, VerifyOtpRequestSerializer
)
from apps.accounts.services.auth_service import generate_jwt_token
from apps.accounts.services.otp_service import create_otp_session, verify_and_consume_otp
from apps.accounts.services.email_service import send_otp_email


class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        password = serializer.validated_data['password']

        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {"detail": "Your account has been deactivated. Please contact support."},
                status=status.HTTP_403_FORBIDDEN
            )

        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])

        token = generate_jwt_token(user)
        return Response({
            "token": token,
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class SendOtpView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = SendOtpRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()

        if not user:
            # Mask user existence to prevent user enumeration attacks
            return Response({
                "message": "If this email is registered, a verification code has been dispatched.",
                "jti": None
            }, status=status.HTTP_200_OK)

        raw_jti, raw_otp, _ = create_otp_session(user)
        send_otp_email(user.email, user.full_name, raw_otp)

        return Response({
            "message": "Verification OTP sent to your registered email address.",
            "jti": raw_jti,
            "expiresInSeconds": 600
        }, status=status.HTTP_200_OK)


class VerifyOtpView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = VerifyOtpRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        jti = serializer.validated_data['jti']
        otp = serializer.validated_data['otp']
        new_password = serializer.validated_data['newPassword']

        try:
            user = verify_and_consume_otp(jti, otp)
            user.set_password(new_password)
            user.save(update_fields=['password_hash', 'updated_at'])
            return Response({
                "message": "Password updated successfully. Please log in with your new credentials."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUserRole]
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
