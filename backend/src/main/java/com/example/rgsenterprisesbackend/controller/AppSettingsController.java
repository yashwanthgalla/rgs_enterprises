package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.AppSettingsRequest;
import com.example.rgsenterprisesbackend.dto.AppSettingsResponse;
import com.example.rgsenterprisesbackend.service.AppSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
@Tag(name = "App Settings", description = "Dynamic organization branding and currency configuration")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    @GetMapping
    @Operation(summary = "Get current application branding settings")
    public ResponseEntity<ApiResponse<AppSettingsResponse>> getSettings() {
        AppSettingsResponse response = appSettingsService.getSettings();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update application branding and company metadata")
    public ResponseEntity<ApiResponse<AppSettingsResponse>> updateSettings(@Valid @RequestBody AppSettingsRequest request) {
        AppSettingsResponse response = appSettingsService.updateSettings(request);
        return ResponseEntity.ok(ApiResponse.ok("Settings updated successfully", response));
    }
}

