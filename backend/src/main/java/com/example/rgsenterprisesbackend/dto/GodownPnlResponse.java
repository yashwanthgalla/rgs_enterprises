package com.example.rgsenterprisesbackend.dto;

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
) {}

