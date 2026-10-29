package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.ExpenseCategory;
import com.example.rgsenterprisesbackend.model.ExpenseResponsibility;
import com.example.rgsenterprisesbackend.model.ExpenseStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ExpenseResponse(
        Long id,
        Long godownId,
        String godownName,
        String godownCode,
        ExpenseCategory category,
        String title,
        BigDecimal amount,
        ExpenseResponsibility responsibility,
        ExpenseStatus status,
        LocalDate billDate,
        LocalDate dueDate,
        LocalDate paymentDate,
        String paymentMethod,
        String transactionRef,
        String receiptUrl,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}

