import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Receipt,
  IndianRupee,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { reportApi } from '../services/api';

export const Reports: React.FC = () => {
  const { formatCurrency } = useSettings();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<any>(null);
  const [pnlList, setPnlList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sRes, pnlRes] = await Promise.all([
        reportApi.getSummary(selectedYear),
        reportApi.getGodownPnl(selectedYear),
      ]);

      setSummary(sRes);
      setPnlList(Array.isArray(pnlRes) ? pnlRes : []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedYear]);

  const handleExportCsv = () => {
    window.open(reportApi.exportCsvUrl(selectedYear), '_blank');
  };

  const totalIncome = summary?.totalRentalIncome || 0;
  const totalExpense = summary?.totalOperatingExpenses || 0;
  const netProfit = summary?.netOperatingIncome || totalIncome - totalExpense;
  const marginPct = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Financial & Tax Reports
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Annual P&L statement, net operating cash flow, and Godown profitability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-32"
          >
            <option value={2025}>FY 2025</option>
            <option value={2026}>FY 2026</option>
            <option value={2027}>FY 2027</option>
          </Select>

          <Button
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" />}
            variant="outline"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Rental Income</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(totalIncome)}</p>
          <span className="text-[11px] text-apple-success font-semibold mt-1 block">Revenue</span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Expenses</span>
          <p className="text-xl font-bold text-apple-danger mt-1">{formatCurrency(totalExpense)}</p>
          <span className="text-[11px] text-gray-400 mt-1 block">Maintenance & utilities</span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Net Operating Income</span>
          <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
            {formatCurrency(netProfit)}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Net balance</span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Operating Margin</span>
          <p className="text-xl font-bold text-apple-accent mt-1">{marginPct}%</p>
          <span className="text-[11px] text-gray-400 mt-1 block">Profit efficiency</span>
        </Card>
      </div>

      {/* Godown-by-Godown P&L Table */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
          Facility Profit & Loss Analysis ({selectedYear})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Godown Facility</th>
                <th className="py-3 px-3">Gross Rent Collected</th>
                <th className="py-3 px-3">Utility & Maint. Expenses</th>
                <th className="py-3 px-3">Net Operating Income</th>
                <th className="py-3 px-3">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Computing financial summary...
                  </td>
                </tr>
              ) : pnlList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No financial data recorded for {selectedYear}.
                  </td>
                </tr>
              ) : (
                pnlList.map((row, idx) => {
                  const income = row.rentalIncome || 0;
                  const exp = row.operatingExpenses || 0;
                  const net = row.netIncome ?? income - exp;
                  const mPct = income > 0 ? Math.round((net / income) * 100) : 0;

                  return (
                    <tr key={idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-gray-100">
                        {row.godownName}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-apple-success">
                        {formatCurrency(income)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-apple-danger">
                        {formatCurrency(exp)}
                      </td>
                      <td className={`py-3.5 px-3 font-bold ${net >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                        {formatCurrency(net)}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant={net >= 0 ? 'success' : 'danger'} size="sm">
                          {mPct}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
