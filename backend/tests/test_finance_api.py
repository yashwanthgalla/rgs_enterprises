import pytest
from rest_framework import status
from apps.hubs.models import Hub


@pytest.mark.django_db
def test_rent_agreement_and_invoice_lifecycle(auth_client_admin, state_ap, admin_user):
    client, admin = auth_client_admin
    hub = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="H1", city="C1", created_by=admin)

    # 1. Create Rent Agreement
    agr_payload = {
        "hubId": hub.id,
        "startDate": "2026-01-01",
        "endDate": "2026-12-31",
        "monthlyRent": "18000.00",
        "tds_applied": True,
        "tdsPercent": "10.00",
        "gst_applied": True,
        "gstPercent": "18.00"
    }
    agr_res = client.post("/api/v1/finance/agreements/", agr_payload, format="json")
    assert agr_res.status_code == status.HTTP_201_CREATED
    agr_id = agr_res.data["id"]

    # 2. Issue Monthly Invoice
    inv_payload = {
        "hubId": hub.id,
        "agreementId": agr_id,
        "periodMonth": "2026-11-01",
        "baseRent": "18000.00",
        "dueDate": "2026-11-05"
    }
    inv_res = client.post("/api/v1/finance/invoices/", inv_payload, format="json")
    assert inv_res.status_code == status.HTTP_201_CREATED
    assert inv_res.data["tdsAmount"] == "1800.00"
    assert inv_res.data["gstAmount"] == "3240.00"
    assert inv_res.data["netPayable"] == "19440.00"
    inv_id = inv_res.data["id"]

    # 3. Disburse Payment
    pay_payload = {
        "invoiceId": inv_id,
        "paymentDate": "2026-11-04",
        "amount": "19440.00",
        "paymentMethod": "BANK_TRANSFER",
        "referenceNumber": "HDFC12345"
    }
    pay_res = client.post("/api/v1/finance/payments/", pay_payload, format="json")
    assert pay_res.status_code == status.HTTP_201_CREATED

    # 4. Monthly Operating Costs
    cost_payload = {
        "hubId": hub.id,
        "periodMonth": "2026-11-01",
        "electricityBill": "3500.00",
        "sorterPayments": "10000.00",
        "pettyCash": "1200.00"
    }
    cost_res = client.post("/api/v1/finance/monthly-costs/", cost_payload, format="json")
    assert cost_res.status_code == status.HTTP_201_CREATED
    assert cost_res.data["totalMonthlyCost"] == "14700.00"
