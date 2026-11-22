from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.permissions import IsAdminUserRole, IsManagerOrAdmin
from apps.reports.services import generate_financial_csv


class ReportsExportCsvView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        export_type = request.query_params.get('exportType') or request.query_params.get('type') or 'total'
        hub_id = request.query_params.get('hubId')
        year_param = request.query_params.get('year')
        year = int(year_param) if year_param else timezone.now().year

        try:
            filename, csv_content = generate_financial_csv(
                year=year,
                export_type=export_type,
                hub_id=int(hub_id) if hub_id else None
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(csv_content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
