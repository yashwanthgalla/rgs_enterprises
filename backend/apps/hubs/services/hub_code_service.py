import re
from typing import Tuple
from django.db import transaction
from django.core.exceptions import ValidationError
from apps.core.models import State
from apps.hubs.models import Hub

CODE_REGEX = re.compile(r'^RGS#[A-Z]{2}\d{2,3}$')


def format_hub_code(state_code: str, number: int) -> str:
    """
    Zero-pad to 2 digits (e.g. 01, 02.. 99), and grow to 3 digits after 99 (e.g. 100, 101).
    """
    if number < 100:
        num_str = f"{number:02d}"
    else:
        num_str = f"{number:d}"
    code = f"RGS#{state_code.upper()}{num_str}"
    if not CODE_REGEX.match(code):
        raise ValidationError(f"Generated code '{code}' does not match format ^RGS#[A-Z]{{2}}\\d{{2,3}}$")
    return code


def generate_next_hub_code(state_id: int) -> Tuple[str, int]:
    """
    Generates the next available Hub Code for a given state using lowest-gap filling.
    Must be called within transaction.atomic().
    Locks the State row with select_for_update() to prevent race conditions in serverless environments.
    """
    if not transaction.get_connection().in_atomic_block:
        raise RuntimeError("generate_next_hub_code must be executed inside transaction.atomic()")

    # 1. Concurrently lock the core_states row
    try:
        state = State.objects.select_for_update().get(id=state_id)
    except State.DoesNotExist:
        raise ValidationError(f"State with ID {state_id} does not exist.")

    # 2. Fetch all currently active code numbers for this state
    active_code_numbers = set(
        Hub.objects.filter(state=state, is_deleted=False)
        .values_list('code_number', flat=True)
    )

    # 3. Find the lowest unused positive integer starting from 1 (gap filling)
    candidate_number = 1
    while candidate_number in active_code_numbers:
        candidate_number += 1

    formatted_code = format_hub_code(state.code, candidate_number)
    return formatted_code, candidate_number
