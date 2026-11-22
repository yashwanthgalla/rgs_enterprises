import pytest
from rest_framework import status
from apps.hubs.models import Hub
from apps.hr.models import Employee


@pytest.mark.django_db
def test_employee_creation_and_salary_masking(auth_client_admin, auth_client_viewer, state_ap, admin_user):
    admin_client, admin = auth_client_admin
    viewer_client, viewer = auth_client_viewer

    # Admin creates Employee
    payload = {
        "fullName": "Suresh Raina",
        "roleTitle": "Supervisor",
        "mobile": "9898989898",
        "monthlySalary": "22000.00"
    }
    create_res = admin_client.post("/api/v1/hr/employees/", payload, format="json")
    assert create_res.status_code == status.HTTP_201_CREATED
    emp_id = create_res.data["id"]
    assert create_res.data["monthlySalary"] == "22000.00"

    # Admin retrieves -> Salary is visible
    admin_get = admin_client.get(f"/api/v1/hr/employees/{emp_id}/")
    assert admin_get.data["monthlySalary"] == "22000.00"

    # Viewer retrieves -> Salary is masked to None on server side
    viewer_get = viewer_client.get(f"/api/v1/hr/employees/{emp_id}/")
    assert viewer_get.status_code == status.HTTP_200_OK
    assert viewer_get.data["monthlySalary"] is None
