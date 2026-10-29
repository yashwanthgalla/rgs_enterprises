package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.GodownStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record GodownResponse(
        Long id,
        String name,
        String code,
        String city,
        String state,
        String address,
        String pincode,
        BigDecimal sizeSqft,
        GodownStatus status,
        String currentTenant,
        String tenantPhone,
        String tenantEmail,
        LocalDate leaseStartDate,
        LocalDate leaseEndDate,
        BigDecimal monthlyRent,
        BigDecimal securityAdvance,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String lastEditedBy
) {}

