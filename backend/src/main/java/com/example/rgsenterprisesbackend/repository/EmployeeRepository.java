package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.Employee;
import com.example.rgsenterprisesbackend.model.EmployeeStatus;
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
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findByGodownIdAndIsDeletedFalse(Long godownId);

    Optional<Employee> findByIdAndIsDeletedFalse(Long id);

    boolean existsByGodownIdAndIsDeletedFalse(Long godownId);

    long countByGodownIdAndIsDeletedFalse(Long godownId);

    @Query("SELECT COALESCE(SUM(e.monthlySalary), 0) FROM Employee e WHERE e.godown.id = :godownId AND e.status = 'ACTIVE' AND e.isDeleted = false")
    BigDecimal sumMonthlySalaryByGodown(@Param("godownId") Long godownId);

    @Query("SELECT e FROM Employee e WHERE e.isDeleted = false AND " +
            "(:godownId IS NULL OR e.godown.id = :godownId) AND " +
            "(:status IS NULL OR e.status = :status) AND " +
            "(:query IS NULL OR (LOWER(e.fullName) LIKE :query OR LOWER(e.role) LIKE :query))")
    Page<Employee> findWithFilters(@Param("godownId") Long godownId,
                                  @Param("status") EmployeeStatus status,
                                  @Param("query") String query,
                                  Pageable pageable);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.status = 'ACTIVE' AND e.isDeleted = false")
    long countActiveEmployees();

    @Query("SELECT COALESCE(SUM(e.monthlySalary), 0) FROM Employee e WHERE e.status = 'ACTIVE' AND e.isDeleted = false")
    BigDecimal sumTotalMonthlySalaries();
}

