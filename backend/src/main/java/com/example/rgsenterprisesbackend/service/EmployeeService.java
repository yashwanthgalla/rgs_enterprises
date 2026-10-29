package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.EmployeeRequest;
import com.example.rgsenterprisesbackend.dto.EmployeeResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.Employee;
import com.example.rgsenterprisesbackend.model.EmployeeStatus;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.repository.EmployeeRepository;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final GodownRepository godownRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public PagedResponse<EmployeeResponse> getEmployees(Long godownId, EmployeeStatus status, String query, Pageable pageable) {
        String queryFilter = (query != null && !query.isBlank()) ? "%" + query.trim().toLowerCase() + "%" : null;
        Page<Employee> page = employeeRepository.findWithFilters(godownId, status, queryFilter, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> getEmployeesByGodown(Long godownId) {
        return employeeRepository.findByGodownIdAndIsDeletedFalse(godownId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getEmployeeById(Long id) {
        Employee emp = employeeRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + id));
        return mapToResponse(emp);
    }

    @Transactional
    public EmployeeResponse createEmployee(EmployeeRequest request) {
        Godown godown = null;
        if (request.godownId() != null) {
            godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId())
                    .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + request.godownId()));
        }

        Employee emp = Employee.builder()
                .godown(godown)
                .fullName(request.fullName())
                .role(request.role())
                .phone(request.phone())
                .email(request.email())
                .monthlySalary(request.monthlySalary())
                .joiningDate(request.joiningDate())
                .status(request.status())
                .isDeleted(false)
                .build();

        Employee saved = employeeRepository.save(emp);
        String godownName = (godown != null) ? godown.getName() : "Unassigned";
        activityLogService.logActivity("EMPLOYEE", saved.getId(), "CREATE",
                "Added employee " + saved.getFullName() + " (" + saved.getRole() + ") to " + godownName);
        return mapToResponse(saved);
    }

    @Transactional
    public EmployeeResponse updateEmployee(Long id, EmployeeRequest request) {
        Employee emp = employeeRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + id));

        if (request.godownId() != null) {
            Godown godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId())
                    .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + request.godownId()));
            emp.setGodown(godown);
        } else {
            emp.setGodown(null);
        }

        emp.setFullName(request.fullName());
        emp.setRole(request.role());
        emp.setPhone(request.phone());
        emp.setEmail(request.email());
        emp.setMonthlySalary(request.monthlySalary());
        emp.setJoiningDate(request.joiningDate());
        emp.setStatus(request.status());

        Employee saved = employeeRepository.save(emp);
        activityLogService.logActivity("EMPLOYEE", saved.getId(), "UPDATE", "Updated staff record for " + saved.getFullName());
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteEmployee(Long id) {
        Employee emp = employeeRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + id));

        emp.setDeleted(true);
        employeeRepository.save(emp);
        activityLogService.logActivity("EMPLOYEE", id, "DELETE", "Removed staff member: " + emp.getFullName());
    }

    public EmployeeResponse mapToResponse(Employee e) {
        String godownName = e.getGodown() != null ? e.getGodown().getName() : "Unassigned";
        String fullGodownInfo = e.getGodown() != null ? e.getGodown().getName() + " (" + e.getGodown().getCode() + ")" : "Unassigned";
        return new EmployeeResponse(
                e.getId(),
                e.getGodown() != null ? e.getGodown().getId() : null,
                godownName,
                fullGodownInfo,
                e.getFullName(),
                e.getRole(),
                e.getPhone(),
                e.getEmail(),
                e.getMonthlySalary(),
                e.getJoiningDate(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}

