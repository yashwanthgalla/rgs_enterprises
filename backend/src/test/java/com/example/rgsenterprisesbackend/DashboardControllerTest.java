package com.example.rgsenterprisesbackend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("GET /api/v1/dashboard/stats computes aggregates from seeded data")
    void getStats_returnsAggregatedKpis() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalGodowns").value(6))
                .andExpect(jsonPath("$.data.activeGodowns").value(5))
                .andExpect(jsonPath("$.data.totalAreaSqft").value(166000.0))
                .andExpect(jsonPath("$.data.occupancyRate").isNumber())
                .andExpect(jsonPath("$.data.monthlyRentRoll").value(1430000.0));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("GET /api/v1/dashboard/reminders returns overdue and upcoming alert items")
    void getReminders_returnsAlertList() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/reminders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("GET /api/v1/dashboard/cashflow-trend returns monthly trends")
    void getCashflowTrend_returnsTrendPoints() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/cashflow-trend?months=6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(6));
    }
}

