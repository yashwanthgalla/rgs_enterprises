package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.AssetCondition;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record AssetResponse(
        Long id,
        Long godownId,
        String godownName,
        String godownCode,
        String name,
        String category,
        String serialNumber,
        Integer quantity,
        BigDecimal cost,
        AssetCondition condition,
        LocalDate purchaseDate,
        LocalDate warrantyExpiryDate,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}

