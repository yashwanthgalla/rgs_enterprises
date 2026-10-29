package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.CashflowTrendResponse;
import com.example.rgsenterprisesbackend.dto.DashboardStatsResponse;
import com.example.rgsenterprisesbackend.dto.ReminderItemResponse;
import com.example.rgsenterprisesbackend.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Aggregated KPIs, alerts, reminders, and cashflow analytics")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Get high-level portfolio KPIs computed in SQL")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboardStats() {
        DashboardStatsResponse response = dashboardService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/reminders")
    @Operation(summary = "Get urgent bills, rent overdues, lease and warranty expiries")
    public ResponseEntity<ApiResponse<List<ReminderItemResponse>>> getReminders() {
        List<ReminderItemResponse> response = dashboardService.getReminders();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/cashflow-trend")
    @Operation(summary = "Get monthly rent income vs expenses cashflow trend")
    public ResponseEntity<ApiResponse<List<CashflowTrendResponse>>> getCashflowTrend(
            @RequestParam(defaultValue = "6") int months
    ) {
        List<CashflowTrendResponse> response = dashboardService.getCashflowTrend(months);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}

