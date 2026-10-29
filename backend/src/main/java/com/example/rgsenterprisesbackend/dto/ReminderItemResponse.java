package com.example.rgsenterprisesbackend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ReminderItemResponse(
        String id,
        String type, // OVERDUE_RENT, UPCOMING_BILL, OVERDUE_BILL, LEASE_EXPIRING, WARRANTY_EXPIRING
        String title,
        String description,
        BigDecimal amount,
        LocalDate dueDate,
        String urgency, // HIGH, MEDIUM, LOW
        Long entityId,
        String godownName
) {}

