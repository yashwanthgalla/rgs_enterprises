from rest_framework import serializers
from apps.assets.models import Equipment


class EquipmentSerializer(serializers.ModelSerializer):
    hubId = serializers.IntegerField(source='hub_id')
    hubCode = serializers.CharField(source='hub.code', read_only=True)
    serialNumber = serializers.CharField(source='serial_number', required=False, allow_blank=True)
    purchaseDate = serializers.DateField(source='purchase_date', required=False, allow_null=True)
    purchaseCost = serializers.DecimalField(source='purchase_cost', max_digits=14, decimal_places=2, default=0.00)

    class Meta:
        model = Equipment
        fields = [
            'id', 'hubId', 'hubCode', 'name', 'category', 'serialNumber',
            'quantity', 'purchaseDate', 'purchaseCost', 'condition', 'created_at'
        ]
        read_only_fields = ['id', 'hubCode', 'created_at']
