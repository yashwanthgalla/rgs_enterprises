from rest_framework import viewsets, permissions
from apps.accounts.permissions import RoleBasedModelPermission
from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, RoleBasedModelPermission]
    serializer_class = DocumentSerializer

    def get_queryset(self):
        qs = Document.objects.filter(is_deleted=False).select_related('hub')
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            qs = qs.filter(hub_id=hub_id)
        cat = self.request.query_params.get('category')
        if cat:
            qs = qs.filter(category=cat.upper())
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
