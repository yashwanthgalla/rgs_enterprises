from rest_framework import serializers
from apps.accounts.models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    isActive = serializers.BooleanField(source='is_active')
    lastLoginAt = serializers.DateTimeField(source='last_login_at', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'fullName', 'mobile', 'role', 'isActive', 'lastLoginAt', 'created_at']
        read_only_fields = ['id', 'lastLoginAt', 'created_at']


class LoginRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)


class LoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserSerializer()


class SendOtpRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class VerifyOtpRequestSerializer(serializers.Serializer):
    jti = serializers.CharField(required=True)
    otp = serializers.CharField(max_length=6, min_length=6, required=True)
    newPassword = serializers.CharField(write_only=True, min_length=8, required=True)
