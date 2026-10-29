package com.example.rgsenterprisesbackend.dto;

import java.time.OffsetDateTime;

public record AppSettingsResponse(
        Long id,
        String companyName,
        String logoUrl,
        String currencySymbol,
        String contactEmail,
        String contactPhone,
        OffsetDateTime updatedAt
) {}

