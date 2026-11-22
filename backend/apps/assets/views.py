from rest_framework import viewsets, permissions
from apps.accounts.permissions import RoleBasedModelPermission
from apps.assets.models import Equipment
from apps.assets.serializers import EquipmentSerializer


class EquipmentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = EquipmentSerializer

    def get_queryset(self):
        qs = Equipment.objects.filter(is_deleted=False).select_related('hub')
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        cat = self.request.query_params.get('category')
        if cat:
            qs = qs.filter(category=cat.upper())
        cond = self.request.query_params.get('condition')
        if cond:
            qs = qs.filter(condition=cond.upper())
        return qs.order_by('id')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
