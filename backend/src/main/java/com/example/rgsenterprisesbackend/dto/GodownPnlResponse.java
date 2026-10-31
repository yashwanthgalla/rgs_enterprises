package com.example.rgsenterprisesbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record GodownPnlResponse(
        Long godownId,
        String godownName,
        String godownCode,
        String city,
        String tenantName,
        BigDecimal rentIncome,
        BigDecimal operatingExpenses,
        BigDecimal staffExpense,
        BigDecimal netProfit,
        String occupancyStatus
) {
        @JsonProperty("rentalIncome")
        public BigDecimal getRentalIncome() {
                return rentIncome != null ? rentIncome : BigDecimal.ZERO;
        }

        @JsonProperty("netIncome")
        public BigDecimal getNetIncome() {
                return netProfit != null ? netProfit : (getRentalIncome().subtract(operatingExpenses != null ? operatingExpenses : BigDecimal.ZERO));
        }
}
