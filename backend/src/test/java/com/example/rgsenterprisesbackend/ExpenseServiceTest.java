package com.example.rgsenterprisesbackend;

import com.example.rgsenterprisesbackend.dto.ExpenseRequest;
import com.example.rgsenterprisesbackend.dto.ExpenseResponse;
import com.example.rgsenterprisesbackend.dto.RecordExpensePaymentRequest;
import com.example.rgsenterprisesbackend.model.*;
import com.example.rgsenterprisesbackend.repository.ExpenseRepository;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import com.example.rgsenterprisesbackend.service.ActivityLogService;
import com.example.rgsenterprisesbackend.service.ExpenseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private GodownRepository godownRepository;
    @Mock
    private ActivityLogService activityLogService;

    @InjectMocks
    private ExpenseService expenseService;

    private Godown mockGodown;
    private Expense mockExpense;

    @BeforeEach
    void setUp() {
        mockGodown = Godown.builder()
                .id(1L)
                .name("Patancheru Central Hub")
                .code("GDN-HYD-01")
                .city("Hyderabad")
                .build();

        mockExpense = Expense.builder()
                .id(10L)
                .godown(mockGodown)
                .category(ExpenseCategory.ELECTRICITY)
                .title("Power Bill Oct 2026")
                .amount(BigDecimal.valueOf(45000))
                .responsibility(ExpenseResponsibility.COMPANY)
                .status(ExpenseStatus.PENDING)
                .billDate(LocalDate.of(2026, 10, 1))
                .dueDate(LocalDate.of(2026, 10, 20))
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("Create expense stores record and logs activity")
    void createExpense_success() {
        ExpenseRequest request = new ExpenseRequest(
                1L, ExpenseCategory.ELECTRICITY, "Power Bill Oct 2026",
                BigDecimal.valueOf(45000), ExpenseResponsibility.COMPANY,
                ExpenseStatus.PENDING, LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 20), null, null, null, null, "Office power bill"
        );

        when(godownRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(mockGodown));
        when(expenseRepository.save(any(Expense.class))).thenReturn(mockExpense);

        ExpenseResponse response = expenseService.createExpense(request);

        assertNotNull(response);
        assertEquals("Power Bill Oct 2026", response.title());
        assertEquals(ExpenseStatus.PENDING, response.status());
        verify(expenseRepository).save(any(Expense.class));
        verify(activityLogService).logActivity(eq("EXPENSE"), eq(10L), eq("CREATE"), anyString());
    }

    @Test
    @DisplayName("Record expense payment updates status to PAID and sets payment metadata")
    void recordExpensePayment_updatesToPaid() {
        RecordExpensePaymentRequest request = new RecordExpensePaymentRequest(
                LocalDate.of(2026, 10, 15),
                "UPI",
                "UPI-REF-9921",
                null,
                "Paid via company account"
        );

        when(expenseRepository.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(mockExpense));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExpenseResponse response = expenseService.recordExpensePayment(10L, request);

        assertEquals(ExpenseStatus.PAID, response.status());
        assertEquals(LocalDate.of(2026, 10, 15), response.paymentDate());
        assertEquals("UPI", response.paymentMethod());
        assertEquals("UPI-REF-9921", response.transactionRef());
    }
}

