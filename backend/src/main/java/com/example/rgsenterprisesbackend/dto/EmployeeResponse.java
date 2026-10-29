package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.EmployeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record EmployeeResponse(
        Long id,
        Long godownId,
        String godownName,
        String fullGodownInfo,
        String fullName,
        String role,
        String phone,
        String email,
        BigDecimal monthlySalary,
        LocalDate joiningDate,
        EmployeeStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}

