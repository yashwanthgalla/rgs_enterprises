package com.example.rgsenterprisesbackend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "godown")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Godown {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(length = 20)
    private String pincode;

    @Column(name = "size_sqft", nullable = false)
    @Builder.Default
    private BigDecimal sizeSqft = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private GodownStatus status = GodownStatus.ACTIVE;

    @Column(name = "current_tenant", length = 200)
    private String currentTenant;

    @Column(name = "tenant_phone", length = 50)
    private String tenantPhone;

    @Column(name = "tenant_email", length = 100)
    private String tenantEmail;

    @Column(name = "lease_start_date")
    private LocalDate leaseStartDate;

    @Column(name = "lease_end_date")
    private LocalDate leaseEndDate;

    @Column(name = "monthly_rent", nullable = false)
    @Builder.Default
    private BigDecimal monthlyRent = BigDecimal.ZERO;

    @Column(name = "security_advance", nullable = false)
    @Builder.Default
    private BigDecimal securityAdvance = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

