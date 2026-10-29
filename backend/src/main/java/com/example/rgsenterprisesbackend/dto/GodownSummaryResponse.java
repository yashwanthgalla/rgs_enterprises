package com.example.rgsenterprisesbackend.dto;

import java.math.BigDecimal;

public record GodownSummaryResponse(
        GodownResponse godown,
        long totalAssets,
        BigDecimal totalAssetValue,
        long totalStaff,
        BigDecimal monthlyStaffCost,
        long pendingBillsCount,
        BigDecimal pendingBillsAmount,
        long overdueRentCount,
        BigDecimal overdueRentAmount
) {}

