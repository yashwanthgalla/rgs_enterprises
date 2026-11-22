from rest_framework import generics, permissions
from rest_framework.response import Response
from datetime import date, timedelta
from apps.finance.models import RentAgreement
from apps.hubs.models import HubLicence, HubBroadbandConnection


class ActiveAlertsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = date.today()
        threshold = today + timedelta(days=30)

        # 1. Expiring Leases
        expiring_leases = RentAgreement.objects.filter(
            is_active=True,
            is_deleted=False,
            end_date__gte=today,
            end_date__lte=threshold
        ).select_related('hub')

        lease_alerts = [
            {
                "hubId": agr.hub_id,
                "hubCode": agr.hub.code,
                "hubName": agr.hub.name,
                "expiryDate": agr.end_date.isoformat(),
                "daysRemaining": (agr.end_date - today).days,
                "monthlyRent": str(agr.monthly_rent)
            }
            for agr in expiring_leases
        ]

        # 2. Expiring Licences
        expiring_licences = HubLicence.objects.filter(
            is_available=True,
            expiry_date__gte=today,
            expiry_date__lte=threshold
        ).select_related('hub')

        licence_alerts = [
            {
                "hubId": lic.hub_id,
                "hubCode": lic.hub.code,
                "licenceType": lic.type,
                "expiryDate": lic.expiry_date.isoformat(),
                "daysRemaining": (lic.expiry_date - today).days
            }
            for lic in expiring_licences
        ]

        # 3. Expiring Broadband Plans
        expiring_broadband = HubBroadbandConnection.objects.filter(
            current_plan_end_date__gte=today,
            current_plan_end_date__lte=threshold
        ).select_related('hub')

        broadband_alerts = [
            {
                "hubId": bb.hub_id,
                "hubCode": bb.hub.code,
                "provider": bb.provider,
                "expiryDate": bb.current_plan_end_date.isoformat(),
                "daysRemaining": (bb.current_plan_end_date - today).days
            }
            for bb in expiring_broadband
        ]

        return Response({
            "totalAlerts": len(lease_alerts) + len(licence_alerts) + len(broadband_alerts),
            "leaseExpiring": lease_alerts,
            "licenceExpiring": licence_alerts,
            "broadbandExpiring": broadband_alerts
        })
