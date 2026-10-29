package com.example.rgsenterprisesbackend.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record RecordExpensePaymentRequest(
        @NotNull(message = "Payment date is required")
        LocalDate paymentDate,

        @NotNull(message = "Payment method is required")
        String paymentMethod,

        String transactionRef,
        String receiptUrl,
        String notes
) {}

