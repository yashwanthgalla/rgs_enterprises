package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.EmployeeStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeRequest(
        Long godownId,

        @NotBlank(message = "Full name is required")
        String fullName,

        @NotBlank(message = "Role is required")
        String role,

        String phone,
        String email,

        @NotNull(message = "Monthly salary is required")
        @PositiveOrZero(message = "Monthly salary must be non-negative")
        BigDecimal monthlySalary,

        @NotNull(message = "Joining date is required")
        LocalDate joiningDate,

        @NotNull(message = "Status is required")
        EmployeeStatus status
) {}

