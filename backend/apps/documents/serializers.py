from rest_framework import serializers
from apps.documents.models import Document


class DocumentSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id', required=False, allow_null=True)
    hubCode = serializers.CharField(source='hub.code', read_only=True)
    fileName = serializers.CharField(source='file_name')
    fileUrl = serializers.CharField(source='file_url')
    fileSizeBytes = serializers.IntegerField(source='file_size_bytes', default=0)
    mimeType = serializers.CharField(source='mime_type', default='application/pdf')

    class Meta:
        model = Document
        fields = [
            'id', 'hubId', 'hubCode', 'category', 'fileName', 'fileUrl',
            'fileSizeBytes', 'mimeType', 'storage_bucket', 'created_at'
        ]
        read_only_fields = ['id', 'hubCode', 'created_at']
