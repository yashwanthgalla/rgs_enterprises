package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.dto.SalaryPaymentRequest;
import com.example.rgsenterprisesbackend.dto.SalaryPaymentResponse;
import com.example.rgsenterprisesbackend.exception.BadRequestException;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.Employee;
import com.example.rgsenterprisesbackend.model.SalaryPayment;
import com.example.rgsenterprisesbackend.model.SalaryStatus;
import com.example.rgsenterprisesbackend.repository.EmployeeRepository;
import com.example.rgsenterprisesbackend.repository.SalaryPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SalaryPaymentService {

    private final SalaryPaymentRepository salaryPaymentRepository;
    private final EmployeeRepository employeeRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public PagedResponse<SalaryPaymentResponse> getSalaryPayments(Long employeeId, SalaryStatus status, String paymentMonth, Pageable pageable) {
        Page<SalaryPayment> page = salaryPaymentRepository.findWithFilters(employeeId, status, paymentMonth, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<SalaryPaymentResponse> getSalaryPaymentsByEmployee(Long employeeId) {
        return salaryPaymentRepository.findByEmployeeIdOrderByPaymentMonthDesc(employeeId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public SalaryPaymentResponse createSalaryPayment(SalaryPaymentRequest request) {
        Employee emp = employeeRepository.findByIdAndIsDeletedFalse(request.employeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + request.employeeId()));

        if (salaryPaymentRepository.findByEmployeeIdAndPaymentMonth(request.employeeId(), request.paymentMonth()).isPresent()) {
            throw new BadRequestException("Salary record already exists for " + emp.getFullName() + " for month " + request.paymentMonth());
        }

        SalaryPayment payment = SalaryPayment.builder()
                .employee(emp)
                .paymentMonth(request.paymentMonth())
                .amount(request.amount())
                .paymentDate(request.paymentDate())
                .status(request.status() != null ? request.status() : SalaryStatus.PAID)
                .paymentMode(request.paymentMode())
                .transactionRef(request.transactionRef())
                .notes(request.notes())
                .build();

        SalaryPayment saved = salaryPaymentRepository.save(payment);
        activityLogService.logActivity("SALARY", saved.getId(), "CREATE",
                "Recorded salary payment of " + saved.getAmount() + " for " + emp.getFullName() + " (" + saved.getPaymentMonth() + ")");
        return mapToResponse(saved);
    }

    @Transactional
    public SalaryPaymentResponse updateSalaryPayment(Long id, SalaryPaymentRequest request) {
        SalaryPayment payment = salaryPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary payment not found with ID: " + id));

        payment.setAmount(request.amount());
        payment.setPaymentDate(request.paymentDate());
        if (request.status() != null) payment.setStatus(request.status());
        payment.setPaymentMode(request.paymentMode());
        payment.setTransactionRef(request.transactionRef());
        payment.setNotes(request.notes());

        SalaryPayment saved = salaryPaymentRepository.save(payment);
        activityLogService.logActivity("SALARY", saved.getId(), "UPDATE",
                "Updated salary payment record for " + saved.getEmployee().getFullName() + " (" + saved.getPaymentMonth() + ")");
        return mapToResponse(saved);
    }

    public SalaryPaymentResponse mapToResponse(SalaryPayment s) {
        String godownName = (s.getEmployee().getGodown() != null) ? s.getEmployee().getGodown().getName() : "Unassigned";
        return new SalaryPaymentResponse(
                s.getId(),
                s.getEmployee().getId(),
                s.getEmployee().getFullName(),
                s.getEmployee().getRole(),
                godownName,
                s.getPaymentMonth(),
                s.getAmount(),
                s.getPaymentDate(),
                s.getStatus(),
                s.getPaymentMode(),
                s.getTransactionRef(),
                s.getNotes(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}

