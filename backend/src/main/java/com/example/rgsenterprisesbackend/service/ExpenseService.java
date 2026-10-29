package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.ExpenseRequest;
import com.example.rgsenterprisesbackend.dto.ExpenseResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.dto.RecordExpensePaymentRequest;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.*;
import com.example.rgsenterprisesbackend.repository.ExpenseRepository;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final GodownRepository godownRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public PagedResponse<ExpenseResponse> getExpenses(Long godownId, ExpenseCategory category, ExpenseStatus status,
                                                     ExpenseResponsibility responsibility, String query, Pageable pageable) {
        String queryFilter = (query != null && !query.isBlank()) ? "%" + query.trim().toLowerCase() + "%" : null;
        Page<Expense> page = expenseRepository.findWithFilters(godownId, category, status, responsibility, queryFilter, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpensesByGodown(Long godownId) {
        return expenseRepository.findByGodownIdAndIsDeletedFalseOrderByBillDateDesc(godownId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(Long id) {
        Expense expense = expenseRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));
        return mapToResponse(expense);
    }

    @Transactional
    public ExpenseResponse createExpense(ExpenseRequest request) {
        Godown godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId())
                .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + request.godownId()));

        Expense expense = Expense.builder()
                .godown(godown)
                .category(request.category())
                .title(request.title())
                .amount(request.amount())
                .responsibility(request.responsibility())
                .status(request.status())
                .billDate(request.billDate())
                .dueDate(request.dueDate())
                .paymentDate(request.paymentDate())
                .paymentMethod(request.paymentMethod())
                .transactionRef(request.transactionRef())
                .receiptUrl(request.receiptUrl())
                .notes(request.notes())
                .isDeleted(false)
                .build();

        Expense saved = expenseRepository.save(expense);
        activityLogService.logActivity("EXPENSE", saved.getId(), "CREATE",
                "Created " + saved.getCategory() + " expense '" + saved.getTitle() + "' of " + saved.getAmount() + " for " + godown.getName());
        return mapToResponse(saved);
    }

    @Transactional
    public ExpenseResponse updateExpense(Long id, ExpenseRequest request) {
        Expense expense = expenseRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));

        if (!expense.getGodown().getId().equals(request.godownId())) {
            Godown godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId())
                    .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + request.godownId()));
            expense.setGodown(godown);
        }

        expense.setCategory(request.category());
        expense.setTitle(request.title());
        expense.setAmount(request.amount());
        expense.setResponsibility(request.responsibility());
        expense.setStatus(request.status());
        expense.setBillDate(request.billDate());
        expense.setDueDate(request.dueDate());
        expense.setPaymentDate(request.paymentDate());
        expense.setPaymentMethod(request.paymentMethod());
        expense.setTransactionRef(request.transactionRef());
        expense.setReceiptUrl(request.receiptUrl());
        expense.setNotes(request.notes());

        Expense saved = expenseRepository.save(expense);
        activityLogService.logActivity("EXPENSE", saved.getId(), "UPDATE", "Updated expense: " + saved.getTitle());
        return mapToResponse(saved);
    }

    @Transactional
    public ExpenseResponse recordExpensePayment(Long id, RecordExpensePaymentRequest request) {
        Expense expense = expenseRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));

        expense.setStatus(ExpenseStatus.PAID);
        expense.setPaymentDate(request.paymentDate());
        expense.setPaymentMethod(request.paymentMethod());
        if (request.transactionRef() != null) expense.setTransactionRef(request.transactionRef());
        if (request.receiptUrl() != null) expense.setReceiptUrl(request.receiptUrl());
        if (request.notes() != null) {
            expense.setNotes(expense.getNotes() != null ? expense.getNotes() + " | " + request.notes() : request.notes());
        }

        Expense saved = expenseRepository.save(expense);
        activityLogService.logActivity("EXPENSE", saved.getId(), "PAYMENT_RECORDED",
                "Marked expense as PAID: " + saved.getTitle() + " (" + saved.getAmount() + ")");
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with ID: " + id));

        expense.setDeleted(true);
        expenseRepository.save(expense);
        activityLogService.logActivity("EXPENSE", id, "DELETE", "Deleted expense: " + expense.getTitle());
    }

    public ExpenseResponse mapToResponse(Expense e) {
        return new ExpenseResponse(
                e.getId(),
                e.getGodown().getId(),
                e.getGodown().getName(),
                e.getGodown().getCode(),
                e.getCategory(),
                e.getTitle(),
                e.getAmount(),
                e.getResponsibility(),
                e.getStatus(),
                e.getBillDate(),
                e.getDueDate(),
                e.getPaymentDate(),
                e.getPaymentMethod(),
                e.getTransactionRef(),
                e.getReceiptUrl(),
                e.getNotes(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}

