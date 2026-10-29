package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.GodownPnlResponse;
import com.example.rgsenterprisesbackend.dto.ReportSummaryResponse;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.repository.ExpenseRepository;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import com.example.rgsenterprisesbackend.repository.RentEntryRepository;
import com.example.rgsenterprisesbackend.repository.SalaryPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final GodownRepository godownRepository;
    private final RentEntryRepository rentEntryRepository;
    private final ExpenseRepository expenseRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;

    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummary(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusMonths(6);
        if (endDate == null) endDate = LocalDate.now();

        BigDecimal totalRentBilled = rentEntryRepository.sumBilledBetween(startDate, endDate);
        BigDecimal totalRentCollected = rentEntryRepository.sumCollectedBetween(startDate, endDate);
        BigDecimal totalRentOutstanding = totalRentBilled.subtract(totalRentCollected);
        if (totalRentOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            totalRentOutstanding = BigDecimal.ZERO;
        }

        BigDecimal totalCompanyExpenses = expenseRepository.sumCompanyExpensesBetween(startDate, endDate);
        BigDecimal totalTenantExpenses = expenseRepository.sumTenantExpensesBetween(startDate, endDate);
        BigDecimal totalSalariesPaid = salaryPaymentRepository.sumPaidBetween(startDate, endDate);

        BigDecimal netProfit = totalRentCollected.subtract(totalCompanyExpenses.add(totalSalariesPaid));

        List<Object[]> rawCategories = expenseRepository.sumByCategoryBetween(startDate, endDate);
        Map<String, BigDecimal> expensesByCategory = new HashMap<>();
        for (Object[] row : rawCategories) {
            expensesByCategory.put(row[0].toString(), (BigDecimal) row[1]);
        }

        return new ReportSummaryResponse(
                startDate,
                endDate,
                totalRentBilled,
                totalRentCollected,
                totalRentOutstanding,
                totalCompanyExpenses,
                totalTenantExpenses,
                totalSalariesPaid,
                netProfit,
                expensesByCategory
        );
    }

    @Transactional(readOnly = true)
    public List<GodownPnlResponse> getGodownPnl(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusMonths(6);
        if (endDate == null) endDate = LocalDate.now();

        List<Godown> godowns = godownRepository.findByIsDeletedFalse();
        List<GodownPnlResponse> list = new ArrayList<>();

        for (Godown g : godowns) {
            BigDecimal rentIncome = rentEntryRepository.sumCollectedByGodownBetween(g.getId(), startDate, endDate);
            BigDecimal operatingExpenses = expenseRepository.sumCompanyExpensesByGodownBetween(g.getId(), startDate, endDate);
            BigDecimal staffExpense = salaryPaymentRepository.sumPaidByGodownBetween(g.getId(), startDate, endDate);
            BigDecimal netProfit = rentIncome.subtract(operatingExpenses.add(staffExpense));

            list.add(new GodownPnlResponse(
                    g.getId(),
                    g.getName(),
                    g.getCode(),
                    g.getCity(),
                    g.getCurrentTenant() != null ? g.getCurrentTenant() : "Vacant",
                    rentIncome,
                    operatingExpenses,
                    staffExpense,
                    netProfit,
                    g.getStatus().name()
            ));
        }

        return list;
    }

    @Transactional(readOnly = true)
    public ByteArrayInputStream generatePnlCsv(LocalDate startDate, LocalDate endDate) {
        List<GodownPnlResponse> pnlList = getGodownPnl(startDate, endDate);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out)) {
            writer.println("Godown ID,Facility Name,Code,City,Tenant,Rent Collected (INR),Operating Expenses (INR),Staff Expense (INR),Net Operating Profit (INR),Status");
            for (GodownPnlResponse item : pnlList) {
                writer.printf("%d,\"%s\",\"%s\",\"%s\",\"%s\",%.2f,%.2f,%.2f,%.2f,%s\n",
                        item.godownId(),
                        item.godownName().replace("\"", "\"\""),
                        item.godownCode(),
                        item.city(),
                        item.tenantName().replace("\"", "\"\""),
                        item.rentIncome(),
                        item.operatingExpenses(),
                        item.staffExpense(),
                        item.netProfit(),
                        item.occupancyStatus()
                );
            }
            writer.flush();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }
}

