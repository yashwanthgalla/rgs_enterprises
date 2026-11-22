from rest_framework import serializers
from django.db import transaction
from apps.core.models import State
from apps.hubs.models import (
    Hub, HubContact, HubLicence, HubCCTVCredential,
    HubBroadbandConnection, HubCodeHistory, HubStatus, HubModel, OccupancyStatus
)
from apps.hubs.services.hub_code_service import generate_next_hub_code
from apps.hubs.services.cctv_crypto_service import encrypt_cctv_password


class StateSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ['id', 'code', 'name']


class HubContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = HubContact
        fields = ['id', 'role', 'name', 'mobile', 'email', 'created_at']
        read_only_fields = ['id', 'created_at']


class HubLicenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HubLicence
        fields = ['id', 'type', 'is_available', 'start_date', 'expiry_date', 'document_id']
        read_only_fields = ['id']


class HubBroadbandSerializer(serializers.ModelSerializer):
    userId = serializers.CharField(source='user_id_code', required=False, allow_blank=True)
    registeredMobile = serializers.CharField(source='registered_mobile', required=False, allow_blank=True)
    currentPlanEndDate = serializers.DateField(source='current_plan_end_date', required=False, allow_null=True)

    class Meta:
        model = HubBroadbandConnection
        fields = ['id', 'provider', 'plan_name', 'speed_mbps', 'registeredMobile', 'userId', 'currentPlanEndDate']
        read_only_fields = ['id']


class HubCCTVOverviewSerializer(serializers.ModelSerializer):
    hasPassword = serializers.SerializerMethodField()

    class Meta:
        model = HubCCTVCredential
        fields = ['username', 'access_url', 'hasPassword']

    def get_hasPassword(self, obj):
        return bool(obj.password_encrypted)


class HubCodeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = HubCodeHistory
        fields = ['id', 'code', 'assigned_at', 'released_at', 'reason']


class HubListSerializer(serializers.ModelSerializer):
    state = StateSimpleSerializer(read_only=True)
    totalCapacity = serializers.DecimalField(source='total_capacity', max_digits=12, decimal_places=2)
    capacityUnit = serializers.CharField(source='capacity_unit')
    occupancyStatus = serializers.CharField(source='occupancy_status')
    isDeleted = serializers.BooleanField(source='is_deleted')

    class Meta:
        model = Hub
        fields = [
            'id', 'code', 'name', 'state', 'city', 'status', 'model',
            'occupancyStatus', 'tenant', 'totalCapacity', 'capacityUnit',
            'isDeleted', 'created_at', 'updated_at'
        ]


class HubDetailSerializer(serializers.ModelSerializer):
    state = StateSimpleSerializer(read_only=True)
    contacts = HubContactSerializer(many=True, read_only=True)
    licences = HubLicenceSerializer(many=True, read_only=True)
    broadband = serializers.SerializerMethodField()
    cctv = HubCCTVOverviewSerializer(read_only=True)
    totalCapacity = serializers.DecimalField(source='total_capacity', max_digits=12, decimal_places=2)
    capacityUnit = serializers.CharField(source='capacity_unit')
    occupancyStatus = serializers.CharField(source='occupancy_status')
    postalCode = serializers.CharField(source='postal_code')
    mapsUrl = serializers.CharField(source='maps_url')
    electricityProvider = serializers.CharField(source='electricity_provider')
    electricityServiceNumber = serializers.CharField(source='electricity_service_number')
    ownerName = serializers.CharField(source='owner_name')
    ownerAddress = serializers.CharField(source='owner_address')
    ownerMobile = serializers.CharField(source='owner_mobile')
    isDeleted = serializers.BooleanField(source='is_deleted')

    class Meta:
        model = Hub
        fields = [
            'id', 'code', 'name', 'state', 'address', 'city', 'postalCode',
            'latitude', 'longitude', 'mapsUrl', 'totalCapacity', 'capacityUnit',
            'status', 'model', 'occupancyStatus', 'tenant',
            'electricityProvider', 'electricityServiceNumber',
            'ownerName', 'ownerAddress', 'ownerMobile',
            'isDeleted', 'contacts', 'licences', 'broadband', 'cctv',
            'created_at', 'updated_at'
        ]

    def get_broadband(self, obj):
        latest = obj.broadband_connections.first()
        return HubBroadbandSerializer(latest).data if latest else None


class HubCreateSerializer(serializers.ModelSerializer):
    stateId = serializers.IntegerField(write_only=True)
    totalCapacity = serializers.DecimalField(source='total_capacity', max_digits=12, decimal_places=2, required=False, default=0.00)
    capacityUnit = serializers.CharField(source='capacity_unit', required=False, default='sq ft')
    occupancyStatus = serializers.CharField(source='occupancy_status', required=False, default=OccupancyStatus.VACANT)
    postalCode = serializers.CharField(source='postal_code', required=False, allow_blank=True)
    mapsUrl = serializers.CharField(source='maps_url', required=False, allow_blank=True)
    electricityProvider = serializers.CharField(source='electricity_provider', required=False, allow_blank=True)
    electricityServiceNumber = serializers.CharField(source='electricity_service_number', required=False, allow_blank=True)
    ownerName = serializers.CharField(source='owner_name', required=False, allow_blank=True)
    ownerAddress = serializers.CharField(source='owner_address', required=False, allow_blank=True)
    ownerMobile = serializers.CharField(source='owner_mobile', required=False, allow_blank=True)

    # Optional initial sub-entities
    cctvUsername = serializers.CharField(write_only=True, required=False, default='admin')
    cctvPassword = serializers.CharField(write_only=True, required=False, allow_blank=True)
    cctvAccessUrl = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Hub
        fields = [
            'id', 'stateId', 'name', 'address', 'city', 'postalCode',
            'latitude', 'longitude', 'mapsUrl', 'totalCapacity', 'capacityUnit',
            'model', 'occupancyStatus', 'tenant',
            'electricityProvider', 'electricityServiceNumber',
            'ownerName', 'ownerAddress', 'ownerMobile',
            'cctvUsername', 'cctvPassword', 'cctvAccessUrl'
        ]
        read_only_fields = ['id']

    @transaction.atomic
    def create(self, validated_data):
        state_id = validated_data.pop('stateId')
        cctv_user = validated_data.pop('cctvUsername', 'admin')
        cctv_pass = validated_data.pop('cctvPassword', None)
        cctv_url = validated_data.pop('cctvAccessUrl', None)

        user = self.context['request'].user

        # Generate atomic gapless hub code
        code, code_number = generate_next_hub_code(state_id)

        hub = Hub.objects.create(
            state_id=state_id,
            code=code,
            code_number=code_number,
            created_by=user,
            **validated_data
        )

        # Record initial code assignment in history
        HubCodeHistory.objects.create(
            hub=hub,
            code=code,
            reason="Initial Hub Creation",
            created_by=user
        )

        # Create CCTV credentials if provided
        if cctv_pass:
            encrypted_pw = encrypt_cctv_password(cctv_pass)
            HubCCTVCredential.objects.create(
                hub=hub,
                username=cctv_user,
                password_encrypted=encrypted_pw,
                access_url=cctv_url,
                created_by=user
            )

        return hub


class HubUpdateSerializer(serializers.ModelSerializer):
    totalCapacity = serializers.DecimalField(source='total_capacity', max_digits=12, decimal_places=2, required=False)
    capacityUnit = serializers.CharField(source='capacity_unit', required=False)
    occupancyStatus = serializers.CharField(source='occupancy_status', required=False)
    postalCode = serializers.CharField(source='postal_code', required=False, allow_blank=True)
    mapsUrl = serializers.CharField(source='maps_url', required=False, allow_blank=True)
    electricityProvider = serializers.CharField(source='electricity_provider', required=False, allow_blank=True)
    electricityServiceNumber = serializers.CharField(source='electricity_service_number', required=False, allow_blank=True)
    ownerName = serializers.CharField(source='owner_name', required=False, allow_blank=True)
    ownerAddress = serializers.CharField(source='owner_address', required=False, allow_blank=True)
    ownerMobile = serializers.CharField(source='owner_mobile', required=False, allow_blank=True)

    class Meta:
        model = Hub
        fields = [
            'name', 'address', 'city', 'postalCode',
            'latitude', 'longitude', 'mapsUrl', 'totalCapacity', 'capacityUnit',
            'status', 'model', 'occupancyStatus', 'tenant',
            'electricityProvider', 'electricityServiceNumber',
            'ownerName', 'ownerAddress', 'ownerMobile'
        ]


class CCTVRevealRequestSerializer(serializers.Serializer):
    adminPassword = serializers.CharField(write_only=True, required=True)


class CCTVRevealResponseSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    access_url = serializers.CharField(allow_null=True)
    revealed_at = serializers.CharField()
