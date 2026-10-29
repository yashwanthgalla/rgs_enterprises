package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findTop20ByOrderByCreatedAtDesc();

    Optional<ActivityLog> findFirstByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);

    @Query("SELECT a FROM ActivityLog a WHERE " +
            "(:entityType IS NULL OR a.entityType = :entityType) AND " +
            "(:entityId IS NULL OR a.entityId = :entityId) ORDER BY a.createdAt DESC")
    Page<ActivityLog> findWithFilters(@Param("entityType") String entityType,
                                      @Param("entityId") Long entityId,
                                      Pageable pageable);
}

