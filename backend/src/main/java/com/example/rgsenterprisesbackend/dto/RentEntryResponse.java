package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.PaymentMethod;
import com.example.rgsenterprisesbackend.model.RentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record RentEntryResponse(
        Long id,
        Long godownId,
        String godownName,
        String godownCode,
        String currentTenant,
        String rentMonth,
        LocalDate dueDate,
        BigDecimal dueAmount,
        BigDecimal paidAmount,
        LocalDate paymentDate,
        RentStatus status,
        PaymentMethod paymentMethod,
        String transactionRef,
        String receiptUrl,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}

