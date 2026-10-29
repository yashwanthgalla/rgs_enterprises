package com.example.rgsenterprisesbackend.dto;

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
) {}

