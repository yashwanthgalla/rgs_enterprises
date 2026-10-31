package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.dto.RecordRentPaymentRequest;
import com.example.rgsenterprisesbackend.dto.RentEntryRequest;
import com.example.rgsenterprisesbackend.dto.RentEntryResponse;
import com.example.rgsenterprisesbackend.exception.BadRequestException;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.model.RentEntry;
import com.example.rgsenterprisesbackend.model.RentStatus;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import com.example.rgsenterprisesbackend.repository.RentEntryRepository;
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
public class RentEntryService {

    private final RentEntryRepository rentEntryRepository;
    private final GodownRepository godownRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public PagedResponse<RentEntryResponse> getRentEntries(Long godownId, RentStatus status, String rentMonth, Pageable pageable) {
        Page<RentEntry> page = rentEntryRepository.findWithFilters(godownId, status, rentMonth, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<RentEntryResponse> getRentEntriesByGodown(Long godownId) {
        return rentEntryRepository.findByGodownIdOrderByRentMonthDesc(godownId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RentEntryResponse getRentEntryById(Long id) {
        RentEntry entry = rentEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rent entry not found with ID: " + id));
        return mapToResponse(entry);
    }

    @Transactional
    public RentEntryResponse createRentEntry(RentEntryRequest request) {
        Godown godown = null;
        if (request.godownId() != null && request.godownId() > 0) {
            godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId()).orElse(null);
        }
        if (godown == null) {
            godown = godownRepository.findByIsDeletedFalse().stream().findFirst()
                    .orElseThrow(() -> new BadRequestException("Please register at least one Godown before generating rent invoices."));
        }

        String month = request.rentMonth();
        if (month != null && month.length() > 7) {
            month = month.substring(0, 7);
        }

        if (rentEntryRepository.findByGodownIdAndRentMonth(godown.getId(), month).isPresent()) {
            throw new BadRequestException("A rent entry already exists for godown '" + godown.getName() + "' for month " + month);
        }

        BigDecimal due = request.getEffectiveDueAmount();
        BigDecimal paid = request.getEffectivePaidAmount();
        LocalDate dueD = request.getEffectiveDueDate();
        RentStatus status = request.status() != null ? request.status() : determineStatus(dueD, due, paid);

        RentEntry entry = RentEntry.builder()
                .godown(godown)
                .rentMonth(month)
                .dueDate(dueD)
                .dueAmount(due)
                .paidAmount(paid)
                .paymentDate(request.paymentDate())
                .status(status)
                .paymentMethod(request.paymentMethod())
                .transactionRef(request.transactionRef())
                .receiptUrl(request.receiptUrl())
                .notes(request.notes())
                .build();

        RentEntry saved = rentEntryRepository.save(entry);
        activityLogService.logActivity("RENT", saved.getId(), "CREATE",
                "Created rent ledger entry for " + godown.getName() + " (" + saved.getRentMonth() + ") amount: " + saved.getDueAmount());
        return mapToResponse(saved);
    }

    @Transactional
    public RentEntryResponse updateRentEntry(Long id, RentEntryRequest request) {
        RentEntry entry = rentEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rent entry not found with ID: " + id));

        entry.setDueDate(request.dueDate());
        entry.setDueAmount(request.dueAmount());
        if (request.paidAmount() != null) entry.setPaidAmount(request.paidAmount());
        entry.setPaymentDate(request.paymentDate());
        if (request.status() != null) {
            entry.setStatus(request.status());
        } else {
            entry.setStatus(determineStatus(request.dueDate(), request.dueAmount(), entry.getPaidAmount()));
        }
        entry.setPaymentMethod(request.paymentMethod());
        entry.setTransactionRef(request.transactionRef());
        entry.setReceiptUrl(request.receiptUrl());
        entry.setNotes(request.notes());

        RentEntry saved = rentEntryRepository.save(entry);
        activityLogService.logActivity("RENT", saved.getId(), "UPDATE",
                "Updated rent ledger entry for " + saved.getGodown().getName() + " (" + saved.getRentMonth() + ")");
        return mapToResponse(saved);
    }

    @Transactional
    public RentEntryResponse recordRentPayment(Long id, RecordRentPaymentRequest request) {
        RentEntry entry = rentEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rent entry not found with ID: " + id));

        BigDecimal newPaidAmount = entry.getPaidAmount().add(request.paidAmount());
        entry.setPaidAmount(newPaidAmount);
        entry.setPaymentDate(request.paymentDate());
        entry.setPaymentMethod(request.paymentMethod());
        if (request.transactionRef() != null) entry.setTransactionRef(request.transactionRef());
        if (request.receiptUrl() != null) entry.setReceiptUrl(request.receiptUrl());
        if (request.notes() != null) {
            entry.setNotes(entry.getNotes() != null ? entry.getNotes() + " | " + request.notes() : request.notes());
        }

        if (newPaidAmount.compareTo(entry.getDueAmount()) >= 0) {
            entry.setStatus(RentStatus.PAID);
        } else {
            entry.setStatus(RentStatus.PARTIAL);
        }

        RentEntry saved = rentEntryRepository.save(entry);
        activityLogService.logActivity("RENT", saved.getId(), "PAYMENT_RECORDED",
                "Recorded payment of " + request.paidAmount() + " for " + saved.getGodown().getName() + " (" + saved.getRentMonth() + ")");
        return mapToResponse(saved);
    }

    private RentStatus determineStatus(LocalDate dueDate, BigDecimal dueAmount, BigDecimal paidAmount) {
        if (paidAmount.compareTo(dueAmount) >= 0) {
            return RentStatus.PAID;
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            return RentStatus.PARTIAL;
        } else if (dueDate.isBefore(LocalDate.now())) {
            return RentStatus.OVERDUE;
        }
        return RentStatus.DUE;
    }

    public RentEntryResponse mapToResponse(RentEntry r) {
        return new RentEntryResponse(
                r.getId(),
                r.getGodown().getId(),
                r.getGodown().getName(),
                r.getGodown().getCode(),
                r.getGodown().getCurrentTenant(),
                r.getRentMonth(),
                r.getDueDate(),
                r.getDueAmount(),
                r.getPaidAmount(),
                r.getPaymentDate(),
                r.getStatus(),
                r.getPaymentMethod(),
                r.getTransactionRef(),
                r.getReceiptUrl(),
                r.getNotes(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}

