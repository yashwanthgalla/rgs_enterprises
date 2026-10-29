package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.Expense;
import com.example.rgsenterprisesbackend.model.ExpenseCategory;
import com.example.rgsenterprisesbackend.model.ExpenseResponsibility;
import com.example.rgsenterprisesbackend.model.ExpenseStatus;
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
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByGodownIdAndIsDeletedFalseOrderByBillDateDesc(Long godownId);

    Optional<Expense> findByIdAndIsDeletedFalse(Long id);

    boolean existsByGodownIdAndIsDeletedFalse(Long godownId);

    @Query("SELECT e FROM Expense e WHERE e.isDeleted = false AND " +
            "(:godownId IS NULL OR e.godown.id = :godownId) AND " +
            "(:category IS NULL OR e.category = :category) AND " +
            "(:status IS NULL OR e.status = :status) AND " +
            "(:responsibility IS NULL OR e.responsibility = :responsibility) AND " +
            "(:query IS NULL OR LOWER(e.title) LIKE :query)")
    Page<Expense> findWithFilters(@Param("godownId") Long godownId,
                                  @Param("category") ExpenseCategory category,
                                  @Param("status") ExpenseStatus status,
                                  @Param("responsibility") ExpenseResponsibility responsibility,
                                  @Param("query") String query,
                                  Pageable pageable);

    @Query("SELECT e FROM Expense e WHERE e.isDeleted = false AND e.status IN ('PENDING', 'RECEIVABLE') AND e.dueDate IS NOT NULL AND e.dueDate <= :threshold ORDER BY e.dueDate ASC")
    List<Expense> findDueOrOverdueExpenses(@Param("threshold") LocalDate threshold);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.isDeleted = false AND e.responsibility = 'COMPANY' AND e.billDate BETWEEN :startDate AND :endDate")
    BigDecimal sumCompanyExpensesBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.isDeleted = false AND e.responsibility = 'TENANT' AND e.billDate BETWEEN :startDate AND :endDate")
    BigDecimal sumTenantExpensesBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.isDeleted = false AND e.status = 'RECEIVABLE'")
    BigDecimal sumTotalReceivableFromTenants();

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.godown.id = :godownId AND e.isDeleted = false AND e.responsibility = 'COMPANY' AND e.billDate BETWEEN :startDate AND :endDate")
    BigDecimal sumCompanyExpensesByGodownBetween(@Param("godownId") Long godownId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.isDeleted = false AND e.billDate BETWEEN :startDate AND :endDate GROUP BY e.category")
    List<Object[]> sumByCategoryBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    long countByGodownIdAndStatusAndIsDeletedFalse(Long godownId, ExpenseStatus status);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.godown.id = :godownId AND e.status IN ('PENDING', 'RECEIVABLE') AND e.isDeleted = false")
    BigDecimal sumPendingAmountByGodown(@Param("godownId") Long godownId);
}

