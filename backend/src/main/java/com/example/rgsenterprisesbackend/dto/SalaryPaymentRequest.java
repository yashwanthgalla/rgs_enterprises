package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.SalaryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalaryPaymentRequest(
        @NotNull(message = "Employee ID is required")
        Long employeeId,

        @NotBlank(message = "Payment month is required (YYYY-MM)")
        @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "Payment month must be formatted as YYYY-MM")
        String paymentMonth,

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be positive")
        BigDecimal amount,

        LocalDate paymentDate,
        SalaryStatus status,
        String paymentMode,
        String transactionRef,
        String notes
) {}

