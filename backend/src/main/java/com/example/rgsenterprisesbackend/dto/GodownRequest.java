package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.GodownStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GodownRequest(
        @NotBlank(message = "Godown name is required")
        String name,

        @NotBlank(message = "Godown code is required")
        String code,

        @NotBlank(message = "City is required")
        String city,

        @NotBlank(message = "State is required")
        String state,

        @NotBlank(message = "Address is required")
        String address,

        String pincode,

        @NotNull(message = "Size in sq ft is required")
        @PositiveOrZero(message = "Size must be non-negative")
        BigDecimal sizeSqft,

        @NotNull(message = "Status is required")
        GodownStatus status,

        String currentTenant,
        String tenantPhone,
        String tenantEmail,
        LocalDate leaseStartDate,
        LocalDate leaseEndDate,

        @PositiveOrZero(message = "Monthly rent must be non-negative")
        BigDecimal monthlyRent,

        @PositiveOrZero(message = "Security advance must be non-negative")
        BigDecimal securityAdvance,

        String notes
) {}

