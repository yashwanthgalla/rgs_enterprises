from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.accounts.models import User
from apps.hubs.models import Hub, HubCodeHistory
from apps.hubs.services.hub_code_service import generate_next_hub_code


@transaction.atomic
def soft_delete_hub(hub: Hub, actor: User, reason: str = "Hub decommissioned") -> str:
    """
    Soft-deletes the Hub, releases its code for reuse, and updates code history.
    """
    if hub.is_deleted:
        raise ValidationError("Hub is already deleted.")

    released_code = hub.code
    now = timezone.now()

    # 1. Update latest code history record with release timestamp
    latest_history = HubCodeHistory.objects.filter(
        hub=hub,
        code=released_code,
        released_at__isnull=True
    ).order_by('-assigned_at').first()

    if latest_history:
        latest_history.released_at = now
        latest_history.save(update_fields=['released_at'])
    else:
        HubCodeHistory.objects.create(
            hub=hub,
            code=released_code,
            assigned_at=hub.created_at,
            released_at=now,
            reason=reason,
            created_by=actor
        )

    # 2. Mark hub as soft-deleted
    hub.soft_delete()

    return released_code


@transaction.atomic
def restore_hub(hub: Hub, actor: User) -> str:
    """
    Restores a soft-deleted hub. If its old code has been reassigned to an active hub,
    generates and assigns the lowest available code.
    """
    if not hub.is_deleted:
        raise ValidationError("Hub is not deleted.")

    # Check if original (state, code_number) is currently occupied by an active hub
    code_conflict = Hub.objects.filter(
        state=hub.state,
        code_number=hub.code_number,
        is_deleted=False
    ).exists()

    if code_conflict:
        # Reallocate lowest available code for this state
        new_code, new_code_number = generate_next_hub_code(hub.state_id)
        hub.code = new_code
        hub.code_number = new_code_number
        hub.is_deleted = False
        hub.deleted_at = None
        hub.save(update_fields=['code', 'code_number', 'is_deleted', 'deleted_at', 'updated_at'])
    else:
        hub.restore()

    # Record new assignment in history
    HubCodeHistory.objects.create(
        hub=hub,
        code=hub.code,
        assigned_at=timezone.now(),
        reason="Hub restored from trash",
        created_by=actor
    )

    return hub.code
