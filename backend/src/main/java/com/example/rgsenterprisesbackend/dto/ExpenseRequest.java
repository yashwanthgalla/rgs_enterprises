package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.ExpenseCategory;
import com.example.rgsenterprisesbackend.model.ExpenseResponsibility;
import com.example.rgsenterprisesbackend.model.ExpenseStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(
        @NotNull(message = "Godown ID is required")
        Long godownId,

        @NotNull(message = "Category is required")
        ExpenseCategory category,

        @NotBlank(message = "Expense title is required")
        String title,

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be positive")
        BigDecimal amount,

        @NotNull(message = "Responsibility is required")
        ExpenseResponsibility responsibility,

        @NotNull(message = "Status is required")
        ExpenseStatus status,

        @NotNull(message = "Bill date is required")
        LocalDate billDate,

        LocalDate dueDate,
        LocalDate paymentDate,
        String paymentMethod,
        String transactionRef,
        String receiptUrl,
        String notes
) {}

