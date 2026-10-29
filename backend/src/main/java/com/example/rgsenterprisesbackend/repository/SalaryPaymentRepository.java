package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.SalaryPayment;
import com.example.rgsenterprisesbackend.model.SalaryStatus;
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
public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {

    List<SalaryPayment> findByEmployeeIdOrderByPaymentMonthDesc(Long employeeId);

    Optional<SalaryPayment> findByEmployeeIdAndPaymentMonth(Long employeeId, String paymentMonth);

    @Query("SELECT s FROM SalaryPayment s WHERE " +
            "(:employeeId IS NULL OR s.employee.id = :employeeId) AND " +
            "(:status IS NULL OR s.status = :status) AND " +
            "(:paymentMonth IS NULL OR s.paymentMonth = :paymentMonth)")
    Page<SalaryPayment> findWithFilters(@Param("employeeId") Long employeeId,
                                        @Param("status") SalaryStatus status,
                                        @Param("paymentMonth") String paymentMonth,
                                        Pageable pageable);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM SalaryPayment s WHERE s.paymentMonth = :paymentMonth AND s.status = 'PAID'")
    BigDecimal sumPaidByMonth(@Param("paymentMonth") String paymentMonth);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM SalaryPayment s WHERE s.paymentDate BETWEEN :startDate AND :endDate AND s.status = 'PAID'")
    BigDecimal sumPaidBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(s.amount), 0) FROM SalaryPayment s WHERE s.employee.godown.id = :godownId AND s.paymentDate BETWEEN :startDate AND :endDate AND s.status = 'PAID'")
    BigDecimal sumPaidByGodownBetween(@Param("godownId") Long godownId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}

