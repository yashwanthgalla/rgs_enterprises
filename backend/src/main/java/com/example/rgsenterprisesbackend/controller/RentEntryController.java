package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.dto.RecordRentPaymentRequest;
import com.example.rgsenterprisesbackend.dto.RentEntryRequest;
import com.example.rgsenterprisesbackend.dto.RentEntryResponse;
import com.example.rgsenterprisesbackend.model.RentStatus;
import com.example.rgsenterprisesbackend.service.RentEntryService;
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
@RequestMapping("/api/v1/rent-entries")
@RequiredArgsConstructor
@Tag(name = "Rent Ledger", description = "Monthly rent roll tracking and payments")
public class RentEntryController {

    private final RentEntryService rentEntryService;

    @GetMapping
    @Operation(summary = "Search rent entries with filters and pagination")
    public ResponseEntity<ApiResponse<PagedResponse<RentEntryResponse>>> getRentEntries(
            @RequestParam(required = false) Long godownId,
            @RequestParam(required = false) RentStatus status,
            @RequestParam(required = false) String rentMonth,
            @PageableDefault(size = 15, sort = "rentMonth", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<RentEntryResponse> response = rentEntryService.getRentEntries(godownId, status, rentMonth, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/godown/{godownId}")
    @Operation(summary = "Get all rent ledger entries for a godown")
    public ResponseEntity<ApiResponse<List<RentEntryResponse>>> getRentEntriesByGodown(@PathVariable Long godownId) {
        List<RentEntryResponse> response = rentEntryService.getRentEntriesByGodown(godownId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single rent entry")
    public ResponseEntity<ApiResponse<RentEntryResponse>> getRentEntryById(@PathVariable Long id) {
        RentEntryResponse response = rentEntryService.getRentEntryById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create rent ledger entry for a godown and month")
    public ResponseEntity<ApiResponse<RentEntryResponse>> createRentEntry(@Valid @RequestBody RentEntryRequest request) {
        RentEntryResponse response = rentEntryService.createRentEntry(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Rent entry created", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update rent entry")
    public ResponseEntity<ApiResponse<RentEntryResponse>> updateRentEntry(
            @PathVariable Long id,
            @Valid @RequestBody RentEntryRequest request
    ) {
        RentEntryResponse response = rentEntryService.updateRentEntry(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Rent entry updated", response));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Record a rent payment for this entry")
    public ResponseEntity<ApiResponse<RentEntryResponse>> recordRentPayment(
            @PathVariable Long id,
            @Valid @RequestBody RecordRentPaymentRequest request
    ) {
        RentEntryResponse response = rentEntryService.recordRentPayment(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Payment recorded successfully", response));
    }
}

