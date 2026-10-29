package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RecordRentPaymentRequest(
        @NotNull(message = "Paid amount is required")
        @Positive(message = "Paid amount must be positive")
        BigDecimal paidAmount,

        @NotNull(message = "Payment date is required")
        LocalDate paymentDate,

        @NotNull(message = "Payment method is required")
        PaymentMethod paymentMethod,

        String transactionRef,
        String receiptUrl,
        String notes
) {}

