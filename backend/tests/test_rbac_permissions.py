import pytest
from rest_framework import status
from apps.hubs.models import Hub


@pytest.mark.django_db
def test_admin_full_access(auth_client_admin, state_ap):
    client, admin = auth_client_admin
    # Admin can create Hub
    create_payload = {
        "stateId": state_ap.id,
        "name": "Admin Hub",
        "address": "Street 1",
        "city": "Vijayawada"
    }
    res = client.post("/api/v1/hubs/", create_payload, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    hub_id = res.data["id"]

    # Admin can delete Hub
    del_res = client.delete(f"/api/v1/hubs/{hub_id}/")
    assert del_res.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_manager_access_restrictions(auth_client_manager, state_ap, admin_user):
    client, manager = auth_client_manager
    # Manager can create Hub
    create_payload = {
        "stateId": state_ap.id,
        "name": "Manager Hub",
        "address": "Street 2",
        "city": "Guntur"
    }
    res = client.post("/api/v1/hubs/", create_payload, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    hub_id = res.data["id"]

    # Manager CANNOT delete Hub (Forbidden)
    del_res = client.delete(f"/api/v1/hubs/{hub_id}/")
    assert del_res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_viewer_read_only_restrictions(auth_client_viewer, state_ap, admin_user):
    client, viewer = auth_client_viewer
    hub = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="H1", city="C1", created_by=admin_user)

    # Viewer CAN read
    get_res = client.get(f"/api/v1/hubs/{hub.id}/")
    assert get_res.status_code == status.HTTP_200_OK

    # Viewer CANNOT create
    post_res = client.post("/api/v1/hubs/", {"stateId": state_ap.id, "name": "Illegal Hub"}, format="json")
    assert post_res.status_code == status.HTTP_403_FORBIDDEN

    # Viewer CANNOT update
    patch_res = client.patch(f"/api/v1/hubs/{hub.id}/", {"name": "Tampered"}, format="json")
    assert patch_res.status_code == status.HTTP_403_FORBIDDEN

    # Viewer CANNOT delete
    del_res = client.delete(f"/api/v1/hubs/{hub.id}/")
    assert del_res.status_code == status.HTTP_403_FORBIDDEN
