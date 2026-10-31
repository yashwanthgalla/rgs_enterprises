package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.EmployeeStatus;
import jakarta.validation.constraints.NotBlank;
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

        @PositiveOrZero(message = "Monthly salary must be non-negative")
        BigDecimal monthlySalary,

        LocalDate joiningDate,
        EmployeeStatus status
) {
    public BigDecimal getEffectiveSalary() {
        return (monthlySalary != null) ? monthlySalary : BigDecimal.ZERO;
    }

    public LocalDate getEffectiveJoiningDate() {
        return (joiningDate != null) ? joiningDate : LocalDate.now();
    }

    public EmployeeStatus getEffectiveStatus() {
        return (status != null) ? status : EmployeeStatus.ACTIVE;
    }
}
