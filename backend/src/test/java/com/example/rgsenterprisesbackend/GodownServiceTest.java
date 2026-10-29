package com.example.rgsenterprisesbackend;

import com.example.rgsenterprisesbackend.dto.GodownRequest;
import com.example.rgsenterprisesbackend.dto.GodownResponse;
import com.example.rgsenterprisesbackend.exception.ConflictException;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.model.GodownStatus;
import com.example.rgsenterprisesbackend.repository.*;
import com.example.rgsenterprisesbackend.service.ActivityLogService;
import com.example.rgsenterprisesbackend.service.GodownService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GodownServiceTest {

    @Mock
    private GodownRepository godownRepository;
    @Mock
    private RentEntryRepository rentEntryRepository;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private ActivityLogService activityLogService;
    @Mock
    private ActivityLogRepository activityLogRepository;

    @InjectMocks
    private GodownService godownService;

    private Godown mockGodown;

    @BeforeEach
    void setUp() {
        mockGodown = Godown.builder()
                .id(1L)
                .name("Kurnool Hub")
                .code("GDN-KNL-01")
                .city("Kurnool")
                .state("Andhra Pradesh")
                .address("Industrial Park Road")
                .sizeSqft(BigDecimal.valueOf(18000))
                .status(GodownStatus.ACTIVE)
                .monthlyRent(BigDecimal.valueOf(150000))
                .securityAdvance(BigDecimal.valueOf(600000))
                .isDeleted(false)
                .build();
    }

    @Test
    @DisplayName("Successfully create godown when code does not already exist")
    void createGodown_success() {
        GodownRequest request = new GodownRequest(
                "Kurnool Hub", "GDN-KNL-01", "Kurnool", "Andhra Pradesh",
                "Industrial Park Road", "518001", BigDecimal.valueOf(18000),
                GodownStatus.ACTIVE, null, null, null, null, null,
                BigDecimal.valueOf(150000), BigDecimal.valueOf(600000), "New facility"
        );

        when(godownRepository.existsByCodeAndIsDeletedFalse("GDN-KNL-01")).thenReturn(false);
        when(godownRepository.save(any(Godown.class))).thenReturn(mockGodown);

        GodownResponse response = godownService.createGodown(request);

        assertNotNull(response);
        assertEquals("Kurnool Hub", response.name());
        assertEquals("GDN-KNL-01", response.code());
        verify(godownRepository).save(any(Godown.class));
    }

    @Test
    @DisplayName("Deleting godown with child assets throws ConflictException (409)")
    void deleteGodown_withChildAssets_throwsConflictException() {
        when(godownRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(mockGodown));
        when(assetRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> godownService.deleteGodown(1L));
        assertTrue(ex.getMessage().contains("Cannot delete godown: child asset records exist"));
        verify(godownRepository, never()).save(any(Godown.class));
    }

    @Test
    @DisplayName("Deleting godown with rent records throws ConflictException (409)")
    void deleteGodown_withRentHistory_throwsConflictException() {
        when(godownRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(mockGodown));
        when(assetRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(false);
        when(employeeRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(false);
        when(rentEntryRepository.existsByGodownId(1L)).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> godownService.deleteGodown(1L));
        assertTrue(ex.getMessage().contains("Cannot delete godown: rent ledger history exists"));
    }

    @Test
    @DisplayName("Deleting godown without child records soft deletes successfully")
    void deleteGodown_noChildren_succeeds() {
        when(godownRepository.findByIdAndIsDeletedFalse(1L)).thenReturn(Optional.of(mockGodown));
        when(assetRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(false);
        when(employeeRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(false);
        when(rentEntryRepository.existsByGodownId(1L)).thenReturn(false);
        when(expenseRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(false);
        when(documentRepository.existsByGodownIdAndIsDeletedFalse(1L)).thenReturn(false);

        godownService.deleteGodown(1L);

        assertTrue(mockGodown.isDeleted());
        verify(godownRepository).save(mockGodown);
    }
}

