package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.PaymentMethod;
import com.example.rgsenterprisesbackend.model.RentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RentEntryRequest(
        @NotNull(message = "Godown ID is required")
        Long godownId,

        @NotBlank(message = "Rent month is required (YYYY-MM)")
        @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "Rent month must be formatted as YYYY-MM")
        String rentMonth,

        @NotNull(message = "Due date is required")
        LocalDate dueDate,

        @NotNull(message = "Due amount is required")
        @PositiveOrZero(message = "Due amount must be non-negative")
        BigDecimal dueAmount,

        @PositiveOrZero(message = "Paid amount must be non-negative")
        BigDecimal paidAmount,

        LocalDate paymentDate,
        RentStatus status,
        PaymentMethod paymentMethod,
        String transactionRef,
        String receiptUrl,
        String notes
) {}

