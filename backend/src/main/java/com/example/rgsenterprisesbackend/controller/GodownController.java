package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.GodownRequest;
import com.example.rgsenterprisesbackend.dto.GodownResponse;
import com.example.rgsenterprisesbackend.dto.GodownSummaryResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.model.GodownStatus;
import com.example.rgsenterprisesbackend.service.GodownService;
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
@RequestMapping("/api/v1/godowns")
@RequiredArgsConstructor
@Tag(name = "Godowns", description = "Warehouse portfolio locations and lease management")
public class GodownController {

    private final GodownService godownService;

    @GetMapping
    @Operation(summary = "Search and list godowns with pagination & filters")
    public ResponseEntity<ApiResponse<PagedResponse<GodownResponse>>> getGodowns(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) GodownStatus status,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 12, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<GodownResponse> response = godownService.getGodowns(city, status, query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/all")
    @Operation(summary = "List all active godowns for dropdowns")
    public ResponseEntity<ApiResponse<List<GodownResponse>>> getAllActiveGodowns() {
        List<GodownResponse> response = godownService.getAllActiveGodowns();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/cities")
    @Operation(summary = "Get list of distinct cities where godowns are located")
    public ResponseEntity<ApiResponse<List<String>>> getCities() {
        List<String> cities = godownService.getCities();
        return ResponseEntity.ok(ApiResponse.ok(cities));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get godown by ID")
    public ResponseEntity<ApiResponse<GodownResponse>> getGodownById(@PathVariable Long id) {
        GodownResponse response = godownService.getGodownById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}/summary")
    @Operation(summary = "Get godown overview including child asset, staff, and bill counts")
    public ResponseEntity<ApiResponse<GodownSummaryResponse>> getGodownSummary(@PathVariable Long id) {
        GodownSummaryResponse response = godownService.getGodownSummary(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new godown location")
    public ResponseEntity<ApiResponse<GodownResponse>> createGodown(@Valid @RequestBody GodownRequest request) {
        GodownResponse response = godownService.createGodown(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Godown created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update godown details")
    public ResponseEntity<ApiResponse<GodownResponse>> updateGodown(
            @PathVariable Long id,
            @Valid @RequestBody GodownRequest request
    ) {
        GodownResponse response = godownService.updateGodown(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Godown updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft delete godown (fails with 409 if child records exist)")
    public ResponseEntity<ApiResponse<Void>> deleteGodown(@PathVariable Long id) {
        godownService.deleteGodown(id);
        return ResponseEntity.ok(ApiResponse.ok("Godown deleted successfully", null));
    }
}

