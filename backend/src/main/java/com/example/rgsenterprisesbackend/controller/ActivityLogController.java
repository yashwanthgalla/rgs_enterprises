package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ActivityLogResponse;
import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.service.ActivityLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/activity-logs")
@RequiredArgsConstructor
@Tag(name = "Activity Log", description = "System audit trail of portfolio modifications")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    @Operation(summary = "Search activity logs with pagination")
    public ResponseEntity<ApiResponse<PagedResponse<ActivityLogResponse>>> getActivities(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<ActivityLogResponse> response = activityLogService.getActivities(entityType, entityId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/recent")
    @Operation(summary = "Get the latest 20 activity records for dashboard feed")
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> getRecentActivities() {
        List<ActivityLogResponse> response = activityLogService.getRecentActivities();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}

