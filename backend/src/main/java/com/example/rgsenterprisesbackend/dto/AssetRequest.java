package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.AssetCondition;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetRequest(
        Long godownId,

        @NotBlank(message = "Asset name is required")
        String name,

        String category,
        String serialNumber,
        Integer quantity,

        @PositiveOrZero(message = "Cost must be non-negative")
        BigDecimal cost,

        AssetCondition condition,
        LocalDate purchaseDate,
        LocalDate warrantyExpiryDate,
        String notes
) {
    public Integer getEffectiveQuantity() {
        return (quantity != null && quantity > 0) ? quantity : 1;
    }

    public BigDecimal getEffectiveCost() {
        return (cost != null) ? cost : BigDecimal.ZERO;
    }

    public AssetCondition getEffectiveCondition() {
        return (condition != null) ? condition : AssetCondition.GOOD;
    }

    public String getEffectiveCategory() {
        return (category != null && !category.isBlank()) ? category : "EQUIPMENT";
    }
}
