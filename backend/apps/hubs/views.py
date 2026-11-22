from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from apps.accounts.models import UserRole
from apps.hubs.models import (
    Hub, HubContact, HubLicence, HubBroadbandConnection,
    HubCodeHistory
)
from apps.hubs.permissions import HubAccessPermission, CanDeleteHub, CanRevealCCTV
from apps.hubs.serializers import (
    HubListSerializer, HubDetailSerializer, HubCreateSerializer,
    HubUpdateSerializer, HubContactSerializer, HubLicenceSerializer,
    HubBroadbandSerializer, HubCodeHistorySerializer,
    CCTVRevealRequestSerializer, CCTVRevealResponseSerializer
)
from apps.hubs.services.cctv_crypto_service import reveal_cctv_credentials
from apps.hubs.services.hub_lifecycle_service import soft_delete_hub, restore_hub


class HubViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HubAccessPermission]

    def get_queryset(self):
        user = self.request.user
        qs = Hub.objects.select_related('state').prefetch_related(
            'contacts', 'licences', 'broadband_connections'
        )

        # Soft deletion filtering
        show_deleted = self.request.query_params.get('show_deleted', 'false').lower() == 'true'
        if show_deleted:
            if user.role != UserRole.ADMIN:
                qs = qs.filter(is_deleted=False)
        else:
            qs = qs.filter(is_deleted=False)

        # Filters
        state_code = self.request.query_params.get('state')
        if state_code:
            qs = qs.filter(state__code__iexact=state_code.strip())

        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city__icontains=city.strip())

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status__iexact=status_param.strip())

        occupancy = self.request.query_params.get('occupancy')
        if occupancy:
            qs = qs.filter(occupancy_status__iexact=occupancy.strip())

        # Search by code or name
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(Q(code__icontains=search) | Q(name__icontains=search))

        # Explicit code exact/prefix filter
        code_filter = self.request.query_params.get('code')
        if code_filter:
            qs = qs.filter(code__icontains=code_filter.strip())

        return qs.order_by('id')

    def get_serializer_class(self):
        if self.action == 'list':
            return HubListSerializer
        if self.action == 'create':
            return HubCreateSerializer
        if self.action in ('update', 'partial_update'):
            return HubUpdateSerializer
        return HubDetailSerializer

    def destroy(self, request, *args, **kwargs):
        hub = self.get_object()
        released_code = soft_delete_hub(hub, request.user)
        return Response({
            "message": f"Hub soft-deleted successfully. Code {released_code} has been released and will be reassigned to the next new hub in this state.",
            "releasedCode": released_code
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanDeleteHub])
    def restore(self, request, pk=None):
        hub = self.get_object()
        active_code = restore_hub(hub, request.user)
        return Response({
            "message": f"Hub restored successfully with active code {active_code}.",
            "code": active_code
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def code_history(self, request, pk=None):
        hub = self.get_object()
        history = hub.code_history.all()
        serializer = HubCodeHistorySerializer(history, many=True)
        return Response(serializer.data)


class CCTVRevealView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, CanRevealCCTV]
    serializer_class = CCTVRevealRequestSerializer

    def post(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        admin_password = serializer.validated_data['adminPassword']
        hub = generics.get_object_or_404(Hub.objects.filter(is_deleted=False), pk=pk)

        # Extract client IP and User-Agent
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        if ',' in ip:
            ip = ip.split(',')[0].strip()
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        creds = reveal_cctv_credentials(
            hub=hub,
            request_user=request.user,
            admin_password=admin_password,
            ip_address=ip,
            user_agent=user_agent
        )

        response_serializer = CCTVRevealResponseSerializer(creds)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class HubContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HubAccessPermission]
    serializer_class = HubContactSerializer

    def get_queryset(self):
        hub_id = self.kwargs.get('hub_pk')
        return HubContact.objects.filter(hub_id=hub_id)

    def perform_create(self, serializer):
        hub_id = self.kwargs.get('hub_pk')
        serializer.save(hub_id=hub_id, created_by=self.request.user)


class HubLicenceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HubAccessPermission]
    serializer_class = HubLicenceSerializer

    def get_queryset(self):
        hub_id = self.kwargs.get('hub_pk')
        return HubLicence.objects.filter(hub_id=hub_id)

    def perform_create(self, serializer):
        hub_id = self.kwargs.get('hub_pk')
        serializer.save(hub_id=hub_id, created_by=self.request.user)


class HubBroadbandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HubAccessPermission]
    serializer_class = HubBroadbandSerializer

    def get_queryset(self):
        hub_id = self.kwargs.get('hub_pk')
        return HubBroadbandConnection.objects.filter(hub_id=hub_id)

    def perform_create(self, serializer):
        hub_id = self.kwargs.get('hub_pk')
        serializer.save(hub_id=hub_id, created_by=self.request.user)
