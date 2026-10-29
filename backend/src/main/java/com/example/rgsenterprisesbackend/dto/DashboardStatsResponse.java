package com.example.rgsenterprisesbackend.dto;

import java.math.BigDecimal;

public record DashboardStatsResponse(
        long totalGodowns,
        long activeGodowns,
        BigDecimal totalAreaSqft,
        double occupancyRate,
        BigDecimal monthlyRentRoll,
        BigDecimal currentMonthCollectedRent,
        BigDecimal currentMonthOverdueRent,
        BigDecimal currentMonthExpenses,
        BigDecimal receivableBillsFromTenants,
        BigDecimal netOperatingIncome,
        long activeStaffCount,
        long totalAssetsCount,
        long urgentRemindersCount
) {}

