package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.Asset;
import com.example.rgsenterprisesbackend.model.AssetCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByGodownIdAndIsDeletedFalse(Long godownId);

    Optional<Asset> findByIdAndIsDeletedFalse(Long id);

    boolean existsByGodownIdAndIsDeletedFalse(Long godownId);

    long countByGodownIdAndIsDeletedFalse(Long godownId);

    @Query("SELECT COALESCE(SUM(a.cost * a.quantity), 0) FROM Asset a WHERE a.godown.id = :godownId AND a.isDeleted = false")
    BigDecimal sumValueByGodown(@Param("godownId") Long godownId);

    @Query("SELECT a FROM Asset a WHERE a.isDeleted = false AND " +
            "(:godownId IS NULL OR a.godown.id = :godownId) AND " +
            "(:condition IS NULL OR a.condition = :condition) AND " +
            "(:category IS NULL OR LOWER(a.category) = :category) AND " +
            "(:query IS NULL OR (LOWER(a.name) LIKE :query OR LOWER(a.serialNumber) LIKE :query))")
    Page<Asset> findWithFilters(@Param("godownId") Long godownId,
                                @Param("condition") AssetCondition condition,
                                @Param("category") String category,
                                @Param("query") String query,
                                Pageable pageable);

    @Query("SELECT a FROM Asset a WHERE a.isDeleted = false AND a.warrantyExpiryDate IS NOT NULL AND a.warrantyExpiryDate <= :threshold ORDER BY a.warrantyExpiryDate ASC")
    List<Asset> findExpiringWarranties(@Param("threshold") LocalDate threshold);

    @Query("SELECT COUNT(a) FROM Asset a WHERE a.isDeleted = false")
    long countTotalAssets();
}

