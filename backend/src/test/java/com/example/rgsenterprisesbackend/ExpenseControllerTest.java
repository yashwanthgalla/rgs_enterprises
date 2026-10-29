package com.example.rgsenterprisesbackend;

import com.example.rgsenterprisesbackend.dto.ExpenseRequest;
import com.example.rgsenterprisesbackend.dto.RecordExpensePaymentRequest;
import com.example.rgsenterprisesbackend.model.ExpenseCategory;
import com.example.rgsenterprisesbackend.model.ExpenseResponsibility;
import com.example.rgsenterprisesbackend.model.ExpenseStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExpenseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("GET /api/v1/expenses returns seeded expense items")
    void getExpenses_authenticated_returnsPagedExpenses() throws Exception {
        mockMvc.perform(get("/api/v1/expenses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.totalElements").isNumber());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("POST /api/v1/expenses creates a new expense record")
    void createExpense_validData_returnsCreated() throws Exception {
        ExpenseRequest request = new ExpenseRequest(
                1L,
                ExpenseCategory.INTERNET,
                "Office High-speed Internet Oct",
                BigDecimal.valueOf(3500),
                ExpenseResponsibility.COMPANY,
                ExpenseStatus.PENDING,
                LocalDate.of(2026, 10, 5),
                LocalDate.of(2026, 10, 25),
                null,
                null,
                null,
                null,
                "ACT Fibernet bill"
        );

        mockMvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Office High-speed Internet Oct"))
                .andExpect(jsonPath("$.data.amount").value(3500));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("POST /api/v1/expenses/{id}/pay marks expense as PAID")
    void payExpense_validData_returnsPaidStatus() throws Exception {
        RecordExpensePaymentRequest request = new RecordExpensePaymentRequest(
                LocalDate.now(),
                "BANK_TRANSFER",
                "CMS-NEFT-88319",
                null,
                "Paid through primary corporate account"
        );

        mockMvc.perform(post("/api/v1/expenses/1/pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PAID"));
    }
}

