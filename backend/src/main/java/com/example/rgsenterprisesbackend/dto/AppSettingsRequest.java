package com.example.rgsenterprisesbackend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;

public record AppSettingsRequest(
        @NotBlank(message = "Company name is required")
        String companyName,

        String logoUrl,

        @NotBlank(message = "Currency symbol is required")
        String currencySymbol,

        String contactEmail,
        String contactPhone
) {}

