package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.SalaryStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SalaryPaymentResponse(
        Long id,
        Long employeeId,
        String employeeName,
        String employeeRole,
        String godownName,
        String paymentMonth,
        BigDecimal amount,
        LocalDate paymentDate,
        SalaryStatus status,
        String paymentMode,
        String transactionRef,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}

