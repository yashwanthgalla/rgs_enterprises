package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.GodownStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GodownRequest(
        @NotBlank(message = "Godown name is required")
        String name,

        String code,
        String city,
        String state,
        String address,
        String pincode,

        @PositiveOrZero(message = "Size must be non-negative")
        BigDecimal sizeSqft,

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
) {
    public String getEffectiveCode() {
        return (code != null && !code.isBlank()) ? code.trim().toUpperCase() : "GDW-" + (System.currentTimeMillis() % 10000);
    }

    public String getEffectiveCity() {
        return (city != null && !city.isBlank()) ? city : "Hyderabad";
    }

    public String getEffectiveState() {
        return (state != null && !state.isBlank()) ? state : "Telangana";
    }

    public String getEffectiveAddress() {
        return (address != null && !address.isBlank()) ? address : "Commercial Facility Address";
    }

    public BigDecimal getEffectiveSizeSqft() {
        return (sizeSqft != null) ? sizeSqft : BigDecimal.valueOf(10000);
    }

    public GodownStatus getEffectiveStatus() {
        return (status != null) ? status : GodownStatus.ACTIVE;
    }
}
