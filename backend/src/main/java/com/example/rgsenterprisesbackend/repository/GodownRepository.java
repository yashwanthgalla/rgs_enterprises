package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.model.GodownStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface GodownRepository extends JpaRepository<Godown, Long> {

    List<Godown> findByIsDeletedFalse();

    Optional<Godown> findByIdAndIsDeletedFalse(Long id);

    boolean existsByCodeAndIsDeletedFalse(String code);

    boolean existsByCodeAndIdNotAndIsDeletedFalse(String code, Long id);

    @Query("SELECT g FROM Godown g WHERE g.isDeleted = false " +
            "AND (:city IS NULL OR LOWER(g.city) = :city) " +
            "AND (:status IS NULL OR g.status = :status) " +
            "AND (:query IS NULL OR (LOWER(g.name) LIKE :query " +
            "     OR LOWER(g.code) LIKE :query " +
            "     OR LOWER(g.currentTenant) LIKE :query))")
    Page<Godown> searchGodowns(@Param("city") String city,
                              @Param("status") GodownStatus status,
                              @Param("query") String query,
                              Pageable pageable);

    @Query("SELECT COUNT(g) FROM Godown g WHERE g.isDeleted = false")
    long countTotalGodowns();

    @Query("SELECT COUNT(g) FROM Godown g WHERE g.isDeleted = false AND g.status = 'ACTIVE'")
    long countActiveGodowns();

    @Query("SELECT COALESCE(SUM(g.sizeSqft), 0) FROM Godown g WHERE g.isDeleted = false")
    BigDecimal sumTotalArea();

    @Query("SELECT COALESCE(SUM(g.monthlyRent), 0) FROM Godown g WHERE g.isDeleted = false AND g.status = 'ACTIVE'")
    BigDecimal sumMonthlyRentRoll();

    @Query("SELECT DISTINCT g.city FROM Godown g WHERE g.isDeleted = false ORDER BY g.city ASC")
    List<String> findDistinctCities();
}

