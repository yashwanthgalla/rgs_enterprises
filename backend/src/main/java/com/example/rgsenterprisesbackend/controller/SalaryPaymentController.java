package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.dto.SalaryPaymentRequest;
import com.example.rgsenterprisesbackend.dto.SalaryPaymentResponse;
import com.example.rgsenterprisesbackend.model.SalaryStatus;
import com.example.rgsenterprisesbackend.service.SalaryPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/salary-payments")
@RequiredArgsConstructor
@Tag(name = "Salary & Payroll", description = "Monthly staff salary disbursement records")
public class SalaryPaymentController {

    private final SalaryPaymentService salaryPaymentService;

    @GetMapping
    @Operation(summary = "List salary payment records with filters")
    public ResponseEntity<ApiResponse<PagedResponse<SalaryPaymentResponse>>> getSalaryPayments(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) SalaryStatus status,
            @RequestParam(required = false) String paymentMonth,
            @PageableDefault(size = 15, sort = "paymentMonth", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<SalaryPaymentResponse> response = salaryPaymentService.getSalaryPayments(employeeId, status, paymentMonth, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/employee/{employeeId}")
    @Operation(summary = "Get salary history for an individual employee")
    public ResponseEntity<ApiResponse<List<SalaryPaymentResponse>>> getSalaryPaymentsByEmployee(@PathVariable Long employeeId) {
        List<SalaryPaymentResponse> response = salaryPaymentService.getSalaryPaymentsByEmployee(employeeId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Record monthly salary disbursement")
    public ResponseEntity<ApiResponse<SalaryPaymentResponse>> createSalaryPayment(@Valid @RequestBody SalaryPaymentRequest request) {
        SalaryPaymentResponse response = salaryPaymentService.createSalaryPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Salary payment logged", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update salary payment record")
    public ResponseEntity<ApiResponse<SalaryPaymentResponse>> updateSalaryPayment(
            @PathVariable Long id,
            @Valid @RequestBody SalaryPaymentRequest request
    ) {
        SalaryPaymentResponse response = salaryPaymentService.updateSalaryPayment(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Salary record updated", response));
    }
}

