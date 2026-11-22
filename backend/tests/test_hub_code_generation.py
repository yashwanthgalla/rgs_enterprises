import pytest
from django.db import transaction
from apps.hubs.models import Hub
from apps.hubs.services.hub_code_service import generate_next_hub_code, format_hub_code
from apps.hubs.services.hub_lifecycle_service import soft_delete_hub, restore_hub


@pytest.mark.django_db
def test_hub_code_formatting():
    assert format_hub_code("AP", 1) == "RGS#AP01"
    assert format_hub_code("AP", 99) == "RGS#AP99"
    assert format_hub_code("AP", 100) == "RGS#AP100"
    assert format_hub_code("TS", 15) == "RGS#TS15"


@pytest.mark.django_db
def test_hub_code_sequential_generation(state_ap, admin_user):
    with transaction.atomic():
        code1, num1 = generate_next_hub_code(state_ap.id)
        assert code1 == "RGS#AP01"
        assert num1 == 1
        Hub.objects.create(state=state_ap, code_number=num1, code=code1, name="Hub 1", city="Vijayawada", created_by=admin_user)

    with transaction.atomic():
        code2, num2 = generate_next_hub_code(state_ap.id)
        assert code2 == "RGS#AP02"
        assert num2 == 2
        Hub.objects.create(state=state_ap, code_number=num2, code=code2, name="Hub 2", city="Guntur", created_by=admin_user)


@pytest.mark.django_db
def test_hub_code_gap_filling(state_ap, admin_user):
    # Setup AP01, AP02, AP03
    with transaction.atomic():
        h1 = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="Hub 1", city="C1", created_by=admin_user)
        h2 = Hub.objects.create(state=state_ap, code_number=2, code="RGS#AP02", name="Hub 2", city="C2", created_by=admin_user)
        h3 = Hub.objects.create(state=state_ap, code_number=3, code="RGS#AP03", name="Hub 3", city="C3", created_by=admin_user)

    # Soft delete AP02 -> Releases code 2
    soft_delete_hub(h2, admin_user)

    # Next generated code must fill the lowest available gap (AP02)
    with transaction.atomic():
        next_code, next_num = generate_next_hub_code(state_ap.id)
        assert next_code == "RGS#AP02"
        assert next_num == 2


@pytest.mark.django_db
def test_hub_restore_code_conflict_reallocation(state_ap, admin_user):
    # Create and delete AP01
    h1 = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="Old Hub", city="C1", created_by=admin_user)
    soft_delete_hub(h1, admin_user)

    # Another hub is created and takes AP01
    h2 = Hub.objects.create(state=state_ap, code_number=1, code="RGS#AP01", name="New Hub", city="C2", created_by=admin_user)

    # Restore h1: should detect code conflict and allocate next lowest free code (AP02)
    restored_code = restore_hub(h1, admin_user)
    assert restored_code == "RGS#AP02"
    h1.refresh_from_db()
    assert h1.code == "RGS#AP02"
    assert h1.is_deleted is False
