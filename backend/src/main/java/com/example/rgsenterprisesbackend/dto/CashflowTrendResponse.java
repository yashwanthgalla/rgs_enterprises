package com.example.rgsenterprisesbackend.dto;

import java.math.BigDecimal;

public record CashflowTrendResponse(
        String month,
        BigDecimal rentIncome,
        BigDecimal operatingExpenses,
        BigDecimal staffSalaries,
        BigDecimal netCashflow
) {}

