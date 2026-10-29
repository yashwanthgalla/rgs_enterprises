package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.AssetCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetRequest(
        @NotNull(message = "Godown ID is required")
        Long godownId,

        @NotBlank(message = "Asset name is required")
        String name,

        @NotBlank(message = "Category is required")
        String category,

        String serialNumber,

        @NotNull(message = "Quantity is required")
        @Positive(message = "Quantity must be at least 1")
        Integer quantity,

        @NotNull(message = "Cost is required")
        @PositiveOrZero(message = "Cost must be non-negative")
        BigDecimal cost,

        @NotNull(message = "Condition is required")
        AssetCondition condition,

        LocalDate purchaseDate,
        LocalDate warrantyExpiryDate,
        String notes
) {}

