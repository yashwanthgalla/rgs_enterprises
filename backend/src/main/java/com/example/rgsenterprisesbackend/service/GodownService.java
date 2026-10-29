package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.GodownRequest;
import com.example.rgsenterprisesbackend.dto.GodownResponse;
import com.example.rgsenterprisesbackend.dto.GodownSummaryResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.exception.BadRequestException;
import com.example.rgsenterprisesbackend.exception.ConflictException;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.model.GodownStatus;
import com.example.rgsenterprisesbackend.model.RentEntry;
import com.example.rgsenterprisesbackend.model.RentStatus;
import com.example.rgsenterprisesbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GodownService {

    private final GodownRepository godownRepository;
    private final RentEntryRepository rentEntryRepository;
    private final AssetRepository assetRepository;
    private final EmployeeRepository employeeRepository;
    private final ExpenseRepository expenseRepository;
    private final DocumentRepository documentRepository;
    private final ActivityLogService activityLogService;
    private final com.example.rgsenterprisesbackend.repository.ActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public PagedResponse<GodownResponse> getGodowns(String city, GodownStatus status, String query, Pageable pageable) {
        String cityFilter = (city != null && !city.isBlank()) ? city.trim().toLowerCase() : null;
        String queryFilter = (query != null && !query.isBlank()) ? "%" + query.trim().toLowerCase() + "%" : null;
        Page<Godown> page = godownRepository.searchGodowns(cityFilter, status, queryFilter, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<GodownResponse> getAllActiveGodowns() {
        return godownRepository.findByIsDeletedFalse().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GodownResponse getGodownById(Long id) {
        Godown godown = godownRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + id));
        return mapToResponse(godown);
    }

    @Transactional(readOnly = true)
    public GodownSummaryResponse getGodownSummary(Long id) {
        Godown godown = godownRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + id));

        long totalAssets = assetRepository.countByGodownIdAndIsDeletedFalse(id);
        BigDecimal totalAssetValue = assetRepository.sumValueByGodown(id);
        long totalStaff = employeeRepository.countByGodownIdAndIsDeletedFalse(id);
        BigDecimal monthlyStaffCost = employeeRepository.sumMonthlySalaryByGodown(id);
        long pendingBills = expenseRepository.countByGodownIdAndStatusAndIsDeletedFalse(id, com.example.rgsenterprisesbackend.model.ExpenseStatus.PENDING);
        BigDecimal pendingBillsAmount = expenseRepository.sumPendingAmountByGodown(id);
        long overdueRents = rentEntryRepository.countByGodownIdAndStatus(id, RentStatus.OVERDUE);
        BigDecimal overdueRentAmount = rentEntryRepository.sumOutstandingByGodown(id);

        return new GodownSummaryResponse(
                mapToResponse(godown),
                totalAssets,
                totalAssetValue,
                totalStaff,
                monthlyStaffCost,
                pendingBills,
                pendingBillsAmount,
                overdueRents,
                overdueRentAmount
        );
    }

    @Transactional
    public GodownResponse createGodown(GodownRequest request) {
        if (godownRepository.existsByCodeAndIsDeletedFalse(request.code())) {
            throw new BadRequestException("A godown with code '" + request.code() + "' already exists");
        }

        Godown godown = Godown.builder()
                .name(request.name())
                .code(request.code().toUpperCase())
                .city(request.city())
                .state(request.state())
                .address(request.address())
                .pincode(request.pincode())
                .sizeSqft(request.sizeSqft())
                .status(request.status())
                .currentTenant(request.currentTenant())
                .tenantPhone(request.tenantPhone())
                .tenantEmail(request.tenantEmail())
                .leaseStartDate(request.leaseStartDate())
                .leaseEndDate(request.leaseEndDate())
                .monthlyRent(request.monthlyRent() != null ? request.monthlyRent() : BigDecimal.ZERO)
                .securityAdvance(request.securityAdvance() != null ? request.securityAdvance() : BigDecimal.ZERO)
                .notes(request.notes())
                .isDeleted(false)
                .build();

        Godown saved = godownRepository.save(godown);
        activityLogService.logActivity("GODOWN", saved.getId(), "CREATE", "Created godown: " + saved.getName() + " (" + saved.getCode() + ")");

        // Automatically create initial rent cycle if monthly rent is specified
        if (saved.getMonthlyRent() != null && saved.getMonthlyRent().compareTo(BigDecimal.ZERO) > 0) {
            createInitialRentEntry(saved);
        }

        return mapToResponse(saved);
    }

    public void createInitialRentEntry(Godown godown) {
        if (godown == null || godown.getMonthlyRent() == null || godown.getMonthlyRent().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        LocalDate today = LocalDate.now();
        String currentMonth = today.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        String cycleMonth = currentMonth;
        LocalDate dueDate;

        if (godown.getLeaseStartDate() != null) {
            cycleMonth = godown.getLeaseStartDate().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
            dueDate = godown.getLeaseStartDate();
        } else {
            dueDate = today.withDayOfMonth(Math.min(today.getDayOfMonth(), 5));
        }

        if (rentEntryRepository.findByGodownIdAndRentMonth(godown.getId(), cycleMonth).isEmpty()) {
            RentStatus status = dueDate.isBefore(today) ? RentStatus.OVERDUE : RentStatus.DUE;
            RentEntry rentEntry = RentEntry.builder()
                    .godown(godown)
                    .rentMonth(cycleMonth)
                    .dueDate(dueDate)
                    .dueAmount(godown.getMonthlyRent())
                    .paidAmount(BigDecimal.ZERO)
                    .status(status)
                    .notes("Initial rent cycle automatically generated for " + godown.getName())
                    .build();
            rentEntryRepository.save(rentEntry);

            activityLogService.logActivity("RENT", rentEntry.getId(), "CREATE",
                    "Auto-generated initial rent cycle for " + godown.getName() + " (" + cycleMonth + ") - INR " + godown.getMonthlyRent());
        }
    }

    @Transactional
    public GodownResponse updateGodown(Long id, GodownRequest request) {
        Godown godown = godownRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + id));

        if (godownRepository.existsByCodeAndIdNotAndIsDeletedFalse(request.code(), id)) {
            throw new BadRequestException("Another godown with code '" + request.code() + "' already exists");
        }

        godown.setName(request.name());
        godown.setCode(request.code().toUpperCase());
        godown.setCity(request.city());
        godown.setState(request.state());
        godown.setAddress(request.address());
        godown.setPincode(request.pincode());
        godown.setSizeSqft(request.sizeSqft());
        godown.setStatus(request.status());
        godown.setCurrentTenant(request.currentTenant());
        godown.setTenantPhone(request.tenantPhone());
        godown.setTenantEmail(request.tenantEmail());
        godown.setLeaseStartDate(request.leaseStartDate());
        godown.setLeaseEndDate(request.leaseEndDate());
        if (request.monthlyRent() != null) godown.setMonthlyRent(request.monthlyRent());
        if (request.securityAdvance() != null) godown.setSecurityAdvance(request.securityAdvance());
        godown.setNotes(request.notes());

        Godown saved = godownRepository.save(godown);
        activityLogService.logActivity("GODOWN", saved.getId(), "UPDATE", "Updated details for godown: " + saved.getName());
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteGodown(Long id) {
        Godown godown = godownRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + id));

        // Enforce constraint: Block deleting a godown that has child records (409)
        if (assetRepository.existsByGodownIdAndIsDeletedFalse(id)) {
            throw new ConflictException("Cannot delete godown: child asset records exist. Reassign or delete assets first.");
        }
        if (employeeRepository.existsByGodownIdAndIsDeletedFalse(id)) {
            throw new ConflictException("Cannot delete godown: assigned employees exist. Reassign staff first.");
        }
        if (rentEntryRepository.existsByGodownId(id)) {
            throw new ConflictException("Cannot delete godown: rent ledger history exists for this facility.");
        }
        if (expenseRepository.existsByGodownIdAndIsDeletedFalse(id)) {
            throw new ConflictException("Cannot delete godown: associated expense bills exist.");
        }
        if (documentRepository.existsByGodownIdAndIsDeletedFalse(id)) {
            throw new ConflictException("Cannot delete godown: associated uploaded documents exist.");
        }

        godown.setDeleted(true);
        godownRepository.save(godown);
        activityLogService.logActivity("GODOWN", id, "DELETE", "Soft deleted godown: " + godown.getName());
    }

    @Transactional(readOnly = true)
    public List<String> getCities() {
        return godownRepository.findDistinctCities();
    }

    public GodownResponse mapToResponse(Godown g) {
        String lastEditedBy = activityLogRepository.findFirstByEntityTypeAndEntityIdOrderByCreatedAtDesc("GODOWN", g.getId())
                .map(com.example.rgsenterprisesbackend.model.ActivityLog::getPerformedBy)
                .orElse("admin");

        return new GodownResponse(
                g.getId(),
                g.getName(),
                g.getCode(),
                g.getCity(),
                g.getState(),
                g.getAddress(),
                g.getPincode(),
                g.getSizeSqft(),
                g.getStatus(),
                g.getCurrentTenant(),
                g.getTenantPhone(),
                g.getTenantEmail(),
                g.getLeaseStartDate(),
                g.getLeaseEndDate(),
                g.getMonthlyRent(),
                g.getSecurityAdvance(),
                g.getNotes(),
                g.getCreatedAt(),
                g.getUpdatedAt(),
                lastEditedBy
        );
    }
}

