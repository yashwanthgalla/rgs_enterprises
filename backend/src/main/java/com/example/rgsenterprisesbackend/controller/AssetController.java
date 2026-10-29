package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.AssetRequest;
import com.example.rgsenterprisesbackend.dto.AssetResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.model.AssetCondition;
import com.example.rgsenterprisesbackend.service.AssetService;
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
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@Tag(name = "Assets", description = "Equipment and asset register per godown")
public class AssetController {

    private final AssetService assetService;

    @GetMapping
    @Operation(summary = "Search equipment register with pagination")
    public ResponseEntity<ApiResponse<PagedResponse<AssetResponse>>> getAssets(
            @RequestParam(required = false) Long godownId,
            @RequestParam(required = false) AssetCondition condition,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 15, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<AssetResponse> response = assetService.getAssets(godownId, condition, category, query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/godown/{godownId}")
    @Operation(summary = "Get all equipment for a single godown")
    public ResponseEntity<ApiResponse<List<AssetResponse>>> getAssetsByGodown(@PathVariable Long godownId) {
        List<AssetResponse> response = assetService.getAssetsByGodown(godownId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get asset by ID")
    public ResponseEntity<ApiResponse<AssetResponse>> getAssetById(@PathVariable Long id) {
        AssetResponse response = assetService.getAssetById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Register new equipment/asset")
    public ResponseEntity<ApiResponse<AssetResponse>> createAsset(@Valid @RequestBody AssetRequest request) {
        AssetResponse response = assetService.createAsset(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Asset created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update asset details")
    public ResponseEntity<ApiResponse<AssetResponse>> updateAsset(
            @PathVariable Long id,
            @Valid @RequestBody AssetRequest request
    ) {
        AssetResponse response = assetService.updateAsset(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Asset updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete asset record")
    public ResponseEntity<ApiResponse<Void>> deleteAsset(@PathVariable Long id) {
        assetService.deleteAsset(id);
        return ResponseEntity.ok(ApiResponse.ok("Asset deleted successfully", null));
    }
}

