package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.RentEntry;
import com.example.rgsenterprisesbackend.model.RentStatus;
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
public interface RentEntryRepository extends JpaRepository<RentEntry, Long> {

    @Query("SELECT r FROM RentEntry r JOIN FETCH r.godown WHERE r.godown.id = :godownId ORDER BY r.rentMonth DESC")
    List<RentEntry> findByGodownIdOrderByRentMonthDesc(@Param("godownId") Long godownId);

    Optional<RentEntry> findByGodownIdAndRentMonth(Long godownId, String rentMonth);

    boolean existsByGodownId(Long godownId);

    @Query(value = "SELECT r FROM RentEntry r JOIN FETCH r.godown g WHERE " +
            "(:godownId IS NULL OR g.id = :godownId) AND " +
            "(:status IS NULL OR r.status = :status) AND " +
            "(:rentMonth IS NULL OR r.rentMonth = :rentMonth)",
           countQuery = "SELECT COUNT(r) FROM RentEntry r WHERE " +
            "(:godownId IS NULL OR r.godown.id = :godownId) AND " +
            "(:status IS NULL OR r.status = :status) AND " +
            "(:rentMonth IS NULL OR r.rentMonth = :rentMonth)")
    Page<RentEntry> findWithFilters(@Param("godownId") Long godownId,
                                    @Param("status") RentStatus status,
                                    @Param("rentMonth") String rentMonth,
                                    Pageable pageable);

    @Query("SELECT r FROM RentEntry r WHERE r.status = 'OVERDUE' OR (r.status = 'DUE' AND r.dueDate <= :dateThreshold) ORDER BY r.dueDate ASC")
    List<RentEntry> findOverdueOrDueSoon(@Param("dateThreshold") LocalDate dateThreshold);

    @Query("SELECT COALESCE(SUM(r.paidAmount), 0) FROM RentEntry r WHERE r.rentMonth = :rentMonth")
    BigDecimal sumPaidByMonth(@Param("rentMonth") String rentMonth);

    @Query("SELECT COALESCE(SUM(r.dueAmount - r.paidAmount), 0) FROM RentEntry r WHERE r.rentMonth = :rentMonth AND r.status IN ('DUE', 'OVERDUE', 'PARTIAL')")
    BigDecimal sumOutstandingByMonth(@Param("rentMonth") String rentMonth);

    @Query("SELECT COALESCE(SUM(r.paidAmount), 0) FROM RentEntry r WHERE r.dueDate BETWEEN :startDate AND :endDate")
    BigDecimal sumCollectedBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(r.dueAmount), 0) FROM RentEntry r WHERE r.dueDate BETWEEN :startDate AND :endDate")
    BigDecimal sumBilledBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(r.paidAmount), 0) FROM RentEntry r WHERE r.godown.id = :godownId AND r.dueDate BETWEEN :startDate AND :endDate")
    BigDecimal sumCollectedByGodownBetween(@Param("godownId") Long godownId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    long countByGodownIdAndStatus(Long godownId, RentStatus status);

    @Query("SELECT COALESCE(SUM(r.dueAmount - r.paidAmount), 0) FROM RentEntry r WHERE r.godown.id = :godownId AND r.status IN ('OVERDUE', 'DUE')")
    BigDecimal sumOutstandingByGodown(@Param("godownId") Long godownId);
}

