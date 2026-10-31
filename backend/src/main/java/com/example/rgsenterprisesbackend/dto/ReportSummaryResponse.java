package com.example.rgsenterprisesbackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record ReportSummaryResponse(
        LocalDate periodStart,
        LocalDate periodEnd,
        BigDecimal totalRentBilled,
        BigDecimal totalRentCollected,
        BigDecimal totalRentOutstanding,
        BigDecimal totalCompanyExpenses,
        BigDecimal totalTenantExpenses,
        BigDecimal totalSalariesPaid,
        BigDecimal netOperatingProfit,
        Map<String, BigDecimal> expensesByCategory
) {
        @JsonProperty("totalRentalIncome")
        public BigDecimal getTotalRentalIncome() {
                return totalRentCollected != null ? totalRentCollected : (totalRentBilled != null ? totalRentBilled : BigDecimal.ZERO);
        }

        @JsonProperty("totalOperatingExpenses")
        public BigDecimal getTotalOperatingExpenses() {
                BigDecimal expenses = totalCompanyExpenses != null ? totalCompanyExpenses : BigDecimal.ZERO;
                BigDecimal salaries = totalSalariesPaid != null ? totalSalariesPaid : BigDecimal.ZERO;
                return expenses.add(salaries);
        }

        @JsonProperty("netOperatingIncome")
        public BigDecimal getNetOperatingIncome() {
                return netOperatingProfit != null ? netOperatingProfit : getTotalRentalIncome().subtract(getTotalOperatingExpenses());
        }
}
