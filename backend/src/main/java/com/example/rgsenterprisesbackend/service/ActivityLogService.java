package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.ActivityLogResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.model.ActivityLog;
import com.example.rgsenterprisesbackend.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Transactional
    public void logActivity(String entityType, Long entityId, String action, String description) {
        String username = "system";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            username = auth.getName();
        }

        ActivityLog log = ActivityLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .description(description)
                .performedBy(username)
                .build();

        activityLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> getRecentActivities() {
        return activityLogRepository.findTop20ByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<ActivityLogResponse> getActivities(String entityType, Long entityId, Pageable pageable) {
        Page<ActivityLog> page = activityLogRepository.findWithFilters(entityType, entityId, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    private ActivityLogResponse mapToResponse(ActivityLog log) {
        return new ActivityLogResponse(
                log.getId(),
                log.getEntityType(),
                log.getEntityId(),
                log.getAction(),
                log.getDescription(),
                log.getPerformedBy(),
                log.getCreatedAt()
        );
    }
}

