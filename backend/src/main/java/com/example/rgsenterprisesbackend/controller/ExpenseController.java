package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.ExpenseRequest;
import com.example.rgsenterprisesbackend.dto.ExpenseResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.dto.RecordExpensePaymentRequest;
import com.example.rgsenterprisesbackend.model.ExpenseCategory;
import com.example.rgsenterprisesbackend.model.ExpenseResponsibility;
import com.example.rgsenterprisesbackend.model.ExpenseStatus;
import com.example.rgsenterprisesbackend.service.ExpenseService;
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
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Expenses & Bills", description = "Utility bills, maintenance, property taxes, and vendor expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    @Operation(summary = "Search expenses and bills with pagination and filters")
    public ResponseEntity<ApiResponse<PagedResponse<ExpenseResponse>>> getExpenses(
            @RequestParam(required = false) Long godownId,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(required = false) ExpenseStatus status,
            @RequestParam(required = false) ExpenseResponsibility responsibility,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 15, sort = "billDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<ExpenseResponse> response = expenseService.getExpenses(godownId, category, status, responsibility, query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/godown/{godownId}")
    @Operation(summary = "Get expenses for a godown")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> getExpensesByGodown(@PathVariable Long godownId) {
        List<ExpenseResponse> response = expenseService.getExpensesByGodown(godownId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single expense by ID")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getExpenseById(@PathVariable Long id) {
        ExpenseResponse response = expenseService.getExpenseById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Log a new expense or bill")
    public ResponseEntity<ApiResponse<ExpenseResponse>> createExpense(@Valid @RequestBody ExpenseRequest request) {
        ExpenseResponse response = expenseService.createExpense(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Expense created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update expense details")
    public ResponseEntity<ApiResponse<ExpenseResponse>> updateExpense(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequest request
    ) {
        ExpenseResponse response = expenseService.updateExpense(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Expense updated successfully", response));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mark an expense as paid with transaction details")
    public ResponseEntity<ApiResponse<ExpenseResponse>> recordExpensePayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordExpensePaymentRequest request
    ) {
        ExpenseResponse response = expenseService.recordExpensePayment(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Expense payment logged successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft delete expense")
    public ResponseEntity<ApiResponse<Void>> deleteExpense(@PathVariable Long id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.ok(ApiResponse.ok("Expense deleted successfully", null));
    }
}

