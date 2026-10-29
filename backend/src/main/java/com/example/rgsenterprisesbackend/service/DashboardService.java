package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.CashflowTrendResponse;
import com.example.rgsenterprisesbackend.dto.DashboardStatsResponse;
import com.example.rgsenterprisesbackend.dto.ReminderItemResponse;
import com.example.rgsenterprisesbackend.model.Asset;
import com.example.rgsenterprisesbackend.model.Expense;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.model.RentEntry;
import com.example.rgsenterprisesbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final GodownRepository godownRepository;
    private final RentEntryRepository rentEntryRepository;
    private final ExpenseRepository expenseRepository;
    private final AssetRepository assetRepository;
    private final EmployeeRepository employeeRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        long totalGodowns = godownRepository.countTotalGodowns();
        long activeGodowns = godownRepository.countActiveGodowns();
        BigDecimal totalAreaSqft = godownRepository.sumTotalArea();

        double occupancyRate = totalGodowns > 0 ? ((double) activeGodowns / totalGodowns) * 100.0 : 0.0;
        occupancyRate = Math.round(occupancyRate * 10.0) / 10.0;

        BigDecimal monthlyRentRoll = godownRepository.sumMonthlyRentRoll();

        String currentMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        BigDecimal currentMonthCollectedRent = rentEntryRepository.sumPaidByMonth(currentMonth);
        BigDecimal currentMonthOverdueRent = rentEntryRepository.sumOutstandingByMonth(currentMonth);

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        BigDecimal currentMonthExpenses = expenseRepository.sumCompanyExpensesBetween(startOfMonth, endOfMonth);
        BigDecimal receivableBillsFromTenants = expenseRepository.sumTotalReceivableFromTenants();

        // Net Operating Income = Rent Collected - (Company Expenses + Staff Salaries)
        BigDecimal currentMonthSalaries = salaryPaymentRepository.sumPaidByMonth(currentMonth);
        BigDecimal netOperatingIncome = currentMonthCollectedRent.subtract(currentMonthExpenses.add(currentMonthSalaries));

        long activeStaffCount = employeeRepository.countActiveEmployees();
        long totalAssetsCount = assetRepository.countTotalAssets();

        List<ReminderItemResponse> reminders = getReminders();
        long urgentRemindersCount = reminders.stream().filter(r -> "HIGH".equals(r.urgency())).count();

        return new DashboardStatsResponse(
                totalGodowns,
                activeGodowns,
                totalAreaSqft,
                occupancyRate,
                monthlyRentRoll,
                currentMonthCollectedRent,
                currentMonthOverdueRent,
                currentMonthExpenses,
                receivableBillsFromTenants,
                netOperatingIncome,
                activeStaffCount,
                totalAssetsCount,
                urgentRemindersCount
        );
    }

    @Transactional(readOnly = true)
    public List<ReminderItemResponse> getReminders() {
        List<ReminderItemResponse> list = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate in30Days = today.plusDays(30);
        LocalDate in60Days = today.plusDays(60);

        // 1. Overdue or upcoming rent entries
        List<RentEntry> overdueRents = rentEntryRepository.findOverdueOrDueSoon(in30Days);
        for (RentEntry r : overdueRents) {
            boolean isOverdue = r.getDueDate().isBefore(today);
            BigDecimal pendingAmount = r.getDueAmount().subtract(r.getPaidAmount());
            if (pendingAmount.compareTo(BigDecimal.ZERO) > 0) {
                list.add(new ReminderItemResponse(
                        "RENT-" + r.getId(),
                        isOverdue ? "OVERDUE_RENT" : "UPCOMING_RENT",
                        (isOverdue ? "Overdue Rent: " : "Rent Due Soon: ") + r.getGodown().getName(),
                        "Pending rent of ₹" + pendingAmount + " for " + r.getRentMonth() + " (" + (r.getGodown().getCurrentTenant() != null ? r.getGodown().getCurrentTenant() : "Tenant") + ")",
                        pendingAmount,
                        r.getDueDate(),
                        isOverdue ? "HIGH" : "MEDIUM",
                        r.getId(),
                        r.getGodown().getName()
                ));
            }
        }

        // 2. Overdue or upcoming utility bills / expenses
        List<Expense> dueExpenses = expenseRepository.findDueOrOverdueExpenses(in30Days);
        for (Expense e : dueExpenses) {
            boolean isOverdue = e.getDueDate() != null && e.getDueDate().isBefore(today);
            list.add(new ReminderItemResponse(
                    "EXPENSE-" + e.getId(),
                    isOverdue ? "OVERDUE_BILL" : "UPCOMING_BILL",
                    (isOverdue ? "Overdue Bill: " : "Upcoming Bill: ") + e.getTitle(),
                    e.getCategory() + " bill of ₹" + e.getAmount() + " at " + e.getGodown().getName() + " (" + e.getResponsibility() + ")",
                    e.getAmount(),
                    e.getDueDate(),
                    isOverdue ? "HIGH" : "MEDIUM",
                    e.getId(),
                    e.getGodown().getName()
            ));
        }

        // 3. Lease Expiries in next 60 days
        List<Godown> allGodowns = godownRepository.findByIsDeletedFalse();
        for (Godown g : allGodowns) {
            if (g.getLeaseEndDate() != null && !g.getLeaseEndDate().isAfter(in60Days)) {
                boolean isExpired = g.getLeaseEndDate().isBefore(today);
                list.add(new ReminderItemResponse(
                        "LEASE-" + g.getId(),
                        isExpired ? "LEASE_EXPIRED" : "LEASE_EXPIRING",
                        (isExpired ? "Lease Expired: " : "Lease Expiring Soon: ") + g.getName(),
                        "Lease with " + (g.getCurrentTenant() != null ? g.getCurrentTenant() : "Tenant") + " ends on " + g.getLeaseEndDate(),
                        g.getMonthlyRent(),
                        g.getLeaseEndDate(),
                        isExpired ? "HIGH" : "MEDIUM",
                        g.getId(),
                        g.getName()
                ));
            }
        }

        // 4. Equipment Warranty Expiries in next 60 days
        List<Asset> expiringAssets = assetRepository.findExpiringWarranties(in60Days);
        for (Asset a : expiringAssets) {
            boolean isExpired = a.getWarrantyExpiryDate().isBefore(today);
            list.add(new ReminderItemResponse(
                    "WARRANTY-" + a.getId(),
                    isExpired ? "WARRANTY_EXPIRED" : "WARRANTY_EXPIRING",
                    (isExpired ? "Warranty Expired: " : "Warranty Expiring: ") + a.getName(),
                    "Equipment at " + a.getGodown().getName() + " warranty ends " + a.getWarrantyExpiryDate(),
                    a.getCost(),
                    a.getWarrantyExpiryDate(),
                    isExpired ? "MEDIUM" : "LOW",
                    a.getId(),
                    a.getGodown().getName()
            ));
        }

        // Sort by urgency HIGH first, then due date
        list.sort((a, b) -> {
            int urgencyCompare = urgencyScore(b.urgency()) - urgencyScore(a.urgency());
            if (urgencyCompare != 0) return urgencyCompare;
            if (a.dueDate() == null) return 1;
            if (b.dueDate() == null) return -1;
            return a.dueDate().compareTo(b.dueDate());
        });

        return list;
    }

    private int urgencyScore(String urgency) {
        if ("HIGH".equals(urgency)) return 3;
        if ("MEDIUM".equals(urgency)) return 2;
        return 1;
    }

    @Transactional(readOnly = true)
    public List<CashflowTrendResponse> getCashflowTrend(int months) {
        List<CashflowTrendResponse> trends = new ArrayList<>();
        LocalDate now = LocalDate.now();

        for (int i = months - 1; i >= 0; i--) {
            LocalDate targetDate = now.minusMonths(i);
            String monthStr = targetDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            LocalDate start = targetDate.withDayOfMonth(1);
            LocalDate end = targetDate.withDayOfMonth(targetDate.lengthOfMonth());

            BigDecimal rent = rentEntryRepository.sumPaidByMonth(monthStr);
            BigDecimal expenses = expenseRepository.sumCompanyExpensesBetween(start, end);
            BigDecimal salaries = salaryPaymentRepository.sumPaidByMonth(monthStr);
            BigDecimal net = rent.subtract(expenses.add(salaries));

            trends.add(new CashflowTrendResponse(
                    targetDate.format(DateTimeFormatter.ofPattern("MMM yyyy")),
                    rent,
                    expenses,
                    salaries,
                    net
            ));
        }
        return trends;
    }
}

