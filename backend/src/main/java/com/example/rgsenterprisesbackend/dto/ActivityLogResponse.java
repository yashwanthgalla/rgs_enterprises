package com.example.rgsenterprisesbackend.dto;

import java.time.OffsetDateTime;

public record ActivityLogResponse(
        Long id,
        String entityType,
        Long entityId,
        String action,
        String description,
        String performedBy,
        OffsetDateTime createdAt
) {}

