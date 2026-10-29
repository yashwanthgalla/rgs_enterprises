package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.EmployeeRequest;
import com.example.rgsenterprisesbackend.dto.EmployeeResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.model.EmployeeStatus;
import com.example.rgsenterprisesbackend.service.EmployeeService;
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
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employees", description = "Workforce and facility personnel management")
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    @Operation(summary = "List employees with search and filters")
    public ResponseEntity<ApiResponse<PagedResponse<EmployeeResponse>>> getEmployees(
            @RequestParam(required = false) Long godownId,
            @RequestParam(required = false) EmployeeStatus status,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 15, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<EmployeeResponse> response = employeeService.getEmployees(godownId, status, query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/godown/{godownId}")
    @Operation(summary = "Get staff assigned to a specific godown")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getEmployeesByGodown(@PathVariable Long godownId) {
        List<EmployeeResponse> response = employeeService.getEmployeesByGodown(godownId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get employee details")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getEmployeeById(@PathVariable Long id) {
        EmployeeResponse response = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Onboard a new employee")
    public ResponseEntity<ApiResponse<EmployeeResponse>> createEmployee(@Valid @RequestBody EmployeeRequest request) {
        EmployeeResponse response = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Employee added successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update employee record")
    public ResponseEntity<ApiResponse<EmployeeResponse>> updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request
    ) {
        EmployeeResponse response = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Employee updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft delete employee")
    public ResponseEntity<ApiResponse<Void>> deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.ok(ApiResponse.ok("Employee deleted successfully", null));
    }
}

