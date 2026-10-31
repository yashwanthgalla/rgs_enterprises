package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.PaymentMethod;
import com.example.rgsenterprisesbackend.model.RentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RentEntryRequest(
        Long godownId,

        @NotBlank(message = "Rent month is required (YYYY-MM)")
        String rentMonth,

        LocalDate dueDate,

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
) {
    public LocalDate getEffectiveDueDate() {
        return (dueDate != null) ? dueDate : LocalDate.now().plusDays(10);
    }

    public BigDecimal getEffectiveDueAmount() {
        return (dueAmount != null) ? dueAmount : BigDecimal.ZERO;
    }

    public BigDecimal getEffectivePaidAmount() {
        return (paidAmount != null) ? paidAmount : BigDecimal.ZERO;
    }
}
