package com.example.rgsenterprisesbackend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record AppSettingsRequest(
        @NotBlank(message = "Company name is required")
        String companyName,

        String logoUrl,

        @JsonAlias({"currency", "defaultCurrency"})
        String currencySymbol,

        @JsonAlias("alertEmail")
        String contactEmail,

        String contactPhone
) {
    public String getEffectiveCurrencySymbol() {
        return (currencySymbol != null && !currencySymbol.isBlank()) ? currencySymbol : "₹";
    }
}
