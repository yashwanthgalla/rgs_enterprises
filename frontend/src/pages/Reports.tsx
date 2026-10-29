import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
  Receipt,
  CreditCard,
  Users,
  Building,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { apiClient } from '../lib/api';
import { ReportSummary, GodownPnl, ApiResponse } from '../types';
import { formatINR, formatINRCompact, formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const PIE_COLORS = [
  '#0071E3',
  '#34C759',
  '#FF9F0A',
  '#AF52DE',
  '#FF2D55',
  '#5856D6',
  '#FF3B30',
  '#64D2FF',
];

export const Reports: React.FC = () => {
  const [period, setPeriod] = useState<'30d' | '90d' | '180d' | '365d'>('180d');

  // Compute dates based on period
  const getDates = () => {
    const end = new Date();
    const start = new Date();
    if (period === '30d') start.setDate(end.getDate() - 30);
    else if (period === '90d') start.setDate(end.getDate() - 90);
    else if (period === '180d') start.setDate(end.getDate() - 180);
    else if (period === '365d') start.setDate(end.getDate() - 365);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDates();

  // Summary query
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['reportSummary', startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportSummary>>('/reports/summary', {
        params: { startDate, endDate },
      });
      return res.data.data;
    },
  });

  // Godown P&L query
  const { data: godownPnl, isLoading: pnlLoading } = useQuery({
    queryKey: ['reportGodownPnl', startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<GodownPnl[]>>('/reports/godown-pnl', {
        params: { startDate, endDate },
      });
      return res.data.data;
    },
  });

  const handleDownloadCsv = () => {
    window.open(
      `http://localhost:8080/api/v1/reports/export-csv?startDate=${startDate}&endDate=${endDate}`,
      '_blank'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const categoryChartData = Object.entries(summary?.expensesByCategory || {}).map(([key, value]) => ({
    name: key.replace('_', ' '),
    value: Number(value),
  }));

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Financial Analytics & P&L
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Aggregated revenue audits, operating expense breakdown, and facility profitability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3.5 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-xs text-apple-text dark:text-apple-darkText focus:outline-none focus:ring-2 focus:ring-apple-accent/20"
          >
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter (90d)</option>
            <option value="180d">Last 6 Months</option>
            <option value="365d">Past 1 Year</option>
          </select>

          <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
            Print View
          </Button>

          <Button variant="primary" size="sm" onClick={handleDownloadCsv} icon={<Download className="w-3.5 h-3.5" />}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h2 className="text-xl font-bold">Warehouse Portfolio Financial Audit Statement</h2>
        <p className="text-xs text-gray-500">
          Period: {formatDate(startDate)} to {formatDate(endDate)}
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Rent Collected
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatINRCompact(summary?.totalRentCollected)}
          </p>
          <span className="text-[11px] text-apple-secondary mt-1 block">
            Billed: {formatINRCompact(summary?.totalRentBilled)}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Outstanding Rent
          </span>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {formatINRCompact(summary?.totalRentOutstanding)}
          </p>
          <span className="text-[11px] text-apple-secondary mt-1 block">
            Pending Tenant Collections
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Operating Expenses
          </span>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {formatINRCompact(summary?.totalCompanyExpenses)}
          </p>
          <span className="text-[11px] text-apple-secondary mt-1 block">
            + Salaries: {formatINRCompact(summary?.totalSalariesPaid)}
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Net Operating Profit
          </span>
          <p className="text-xl font-bold text-apple-accent mt-0.5">
            {formatINRCompact(summary?.netOperatingProfit)}
          </p>
          <span className="text-[11px] text-apple-secondary mt-1 block">
            Net Portfolio Cashflow
          </span>
        </Card>
      </div>

      {/* Category Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-apple-text dark:text-apple-darkText mb-1">
            Expense Allocation
          </h3>
          <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mb-4">
            Category distribution across all facilities
          </p>

          <div className="h-60 w-full flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-apple-secondary">No expenses in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Amount']}
                    contentStyle={{
                      backgroundColor: 'rgba(28,28,30,0.9)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Facility Profit & Loss Statement Table */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-apple-text dark:text-apple-darkText">
                Facility Profit & Loss (P&L) Statement
              </h3>
              <p className="text-xs text-apple-secondary">
                Computed via backend SQL aggregations per godown
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-apple-secondary">
                  <th className="py-2.5 px-3">Facility</th>
                  <th className="py-2.5 px-3">City</th>
                  <th className="py-2.5 px-3">Tenant</th>
                  <th className="py-2.5 px-3 text-right">Rent Income</th>
                  <th className="py-2.5 px-3 text-right">Bills & Staff</th>
                  <th className="py-2.5 px-3 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {(godownPnl || []).map((pnl) => (
                  <tr key={pnl.godownId} className="hover:bg-black/[0.01]">
                    <td className="py-3 px-3 font-semibold text-apple-text">
                      {pnl.godownName}
                    </td>
                    <td className="py-3 px-3 text-apple-secondary">{pnl.city}</td>
                    <td className="py-3 px-3 text-apple-secondary truncate max-w-[120px]">
                      {pnl.tenantName}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatINR(pnl.rentIncome)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                      {formatINR(pnl.operatingExpenses + pnl.staffExpense)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold ${
                        pnl.netProfit >= 0
                          ? 'text-apple-accent'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatINR(pnl.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

