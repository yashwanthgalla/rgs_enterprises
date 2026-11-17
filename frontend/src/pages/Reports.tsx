import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { reportApi, godownApi } from '../services/api';
import { Godown, ReportSummary, GodownPnlItem } from '../types';
import { clsx } from 'clsx';

export const Reports: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [pnlList, setPnlList] = useState<GodownPnlItem[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'total' | 'single'>('total');
  const [selectedExportHubId, setSelectedExportHubId] = useState<string>('');
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  // Track active fetch requests to avoid race conditions
  const activeFetchIdRef = useRef<number>(0);

  // 1. Fetch Hub facilities list once on mount (De-duplicated; not re-queried on year toggle)
  useEffect(() => {
    let isCancelled = false;

    godownApi
      .getAllList()
      .then((gList: any) => {
        if (isCancelled) return;
        const list: Godown[] = Array.isArray(gList) ? gList : (gList as any)?.content || [];
        setGodowns(list);
        if (list.length > 0) {
          setSelectedExportHubId((prev) => prev || String(list[0].id));
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load hubs list:', err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Fetch Yearly Report Data with race condition prevention and granular error feedback
  const fetchReportsForYear = (year: number) => {
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    setFetchError(null);

    Promise.allSettled([
      reportApi.getSummary(year),
      reportApi.getGodownPnl(year),
    ])
      .then(([sResult, pnlResult]) => {
        if (fetchId !== activeFetchIdRef.current) return;

        let hasError = false;

        if (sResult.status === 'fulfilled') {
          setSummary(sResult.value as ReportSummary);
        } else {
          hasError = true;
          console.error('Failed to load summary for year', year, sResult.reason);
        }

        if (pnlResult.status === 'fulfilled') {
          setPnlList(Array.isArray(pnlResult.value) ? pnlResult.value : []);
        } else {
          hasError = true;
          console.error('Failed to load PnL list for year', year, pnlResult.reason);
        }

        if (hasError) {
          const msg = 'Some report data could not be loaded. Please check your network and try again.';
          setFetchError(msg);
          error(msg);
        }
      })
      .catch((err: any) => {
        if (fetchId !== activeFetchIdRef.current) return;
        const msg = err.message || 'Failed to load financial reports';
        setFetchError(msg);
        error(msg);
      })
      .finally(() => {
        if (fetchId === activeFetchIdRef.current) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchReportsForYear(selectedYear);
  }, [selectedYear]);

  const handleRetry = () => {
    fetchReportsForYear(selectedYear);
  };

  const handleDownloadCsv = () => {
    if (exportScope === 'single' && !selectedExportHubId) {
      error('Please select a Hub facility to export its monthly data.');
      return;
    }

    const downloadUrl = reportApi.exportCsvUrl({
      year: exportYear,
      type: exportScope,
      hubId: exportScope === 'single' ? selectedExportHubId : undefined,
    });

    window.open(downloadUrl, '_blank');
    success(
      exportScope === 'total'
        ? 'Exporting Total Hubs financial report matching template...'
        : 'Exporting Single Hub monthly financial breakdown...'
    );
    setIsExportModalOpen(false);
  };

  // Standardized schema metrics with clean fallback
  const totalRevenue = summary?.totalRevenue ?? summary?.totalRentalIncome ?? 0;
  const totalRent = summary?.totalRent ?? summary?.totalRentOutflow ?? summary?.totalExpenses ?? 0;
  const totalProfit = summary?.totalProfit ?? (totalRevenue - totalRent);
  const totalMargin = summary?.totalMargin ?? totalProfit;
  const marginPct =
    summary?.marginPercent ??
    (totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0);

  // Sums across PnL list for table footer
  const tableTotalRevenue = pnlList.reduce((acc, r) => acc + (r.totalRevenue ?? 0), 0);
  const tableTotalRent = pnlList.reduce((acc, r) => acc + (r.totalRent ?? 0), 0);
  const tableTotalProfit = pnlList.reduce((acc, r) => acc + (r.totalProfit ?? 0), 0);
  const tableTotalMargin = pnlList.reduce((acc, r) => acc + (r.margin ?? 0), 0);

  const selectedExportGodown = godowns.find(
    (g) => String(g.id) === String(selectedExportHubId)
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-apple-accent" />
            <span>Reports</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Standard enterprise profit & loss statements, revenue ledgers, and template CSV exports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setSelectedYear(y);
              setExportYear(y);
            }}
            className="w-32"
          >
            <option value={2025}>FY 2025</option>
            <option value={2026}>FY 2026</option>
            <option value={2027}>FY 2027</option>
          </Select>

          <Button
            onClick={() => setIsExportModalOpen(true)}
            icon={<Download className="w-4 h-4" />}
            variant="primary"
            className="rounded-xl shadow-apple-sm font-semibold"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error Feedback Banner */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-apple-danger/10 border border-apple-danger/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-apple-danger font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="shrink-0 text-xs font-semibold"
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total Revenue
          </span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(totalRevenue)}
          </p>
          <span className="text-[11px] text-apple-success font-semibold mt-1 block">
            Portfolio Revenue
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total Rent Outflow
          </span>
          <p className="text-xl font-bold text-apple-danger mt-1">
            {formatCurrency(totalRent)}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Rent & operational outflow
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-apple-success">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total Profit
          </span>
          <p
            className={`text-xl font-extrabold mt-1 ${
              totalProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'
            }`}
          >
            {formatCurrency(totalProfit)}
          </p>
          <span className="text-[11px] text-apple-success font-semibold mt-1 block">
            Total Revenue − Total Rent
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total Margin
          </span>
          <p className="text-xl font-bold text-apple-accent mt-1">
            {formatCurrency(totalMargin)}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">
            Margin Efficiency ({marginPct}%)
          </span>
        </Card>
      </div>

      {/* Hub-by-Hub P&L Table */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Hub Profit & Loss Analysis ({selectedYear})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live financial margins and Total Profit calculated from Total Revenue and Rent ledgers
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Export Template Format
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Hub Facility</th>
                <th className="py-3 px-3">Total Revenue</th>
                <th className="py-3 px-3">Total Rent Outflow</th>
                <th className="py-3 px-3">Total Profit</th>
                <th className="py-3 px-3">Margin</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-apple-accent" />
                      <span>Computing financial summary...</span>
                    </div>
                  </td>
                </tr>
              ) : pnlList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No financial data recorded for {selectedYear}.
                  </td>
                </tr>
              ) : (
                <>
                  {pnlList.map((row) => {
                    const rowRev = row.totalRevenue ?? 0;
                    const rowRent = row.totalRent ?? 0;
                    const rowProfit = row.totalProfit ?? (rowRev - rowRent);
                    const rowMargin = row.margin ?? 0;
                    const mPct = row.profitMargin ?? (rowRev > 0 ? Math.round((rowProfit / rowRev) * 100) : 0);

                    return (
                      <tr
                        key={row.godownId}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-gray-900 dark:text-gray-100">
                            {row.godownName}
                          </p>
                          {row.godownCode && (
                            <p className="text-[10px] text-gray-400 font-mono">
                              {row.godownCode} • {row.city || 'Hub'}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                          {formatCurrency(rowRev)}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-apple-danger">
                          {formatCurrency(rowRent)}
                        </td>
                        <td
                          className={`py-3.5 px-3 font-extrabold ${
                            rowProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'
                          }`}
                        >
                          {formatCurrency(rowProfit)}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-apple-accent">
                          {formatCurrency(rowMargin)}
                          <span className="text-[10px] text-gray-400 ml-1.5">
                            ({mPct}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <Badge variant={rowProfit >= 0 ? 'success' : 'danger'} size="sm">
                            {rowProfit >= 0 ? 'Profitable' : 'Deficit'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Total Row */}
                  <tr className="bg-black/[0.03] dark:bg-white/[0.04] font-bold border-t-2 border-black/[0.08] dark:border-white/[0.08]">
                    <td className="py-3.5 px-3 uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      TOTAL ({pnlList.length} Hub{pnlList.length !== 1 ? 's' : ''})
                    </td>
                    <td className="py-3.5 px-3 text-gray-900 dark:text-gray-100">
                      {formatCurrency(tableTotalRevenue)}
                    </td>
                    <td className="py-3.5 px-3 text-apple-danger">
                      {formatCurrency(tableTotalRent)}
                    </td>
                    <td
                      className={`py-3.5 px-3 font-black text-sm ${
                        tableTotalProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'
                      }`}
                    >
                      {formatCurrency(tableTotalProfit)}
                    </td>
                    <td className="py-3.5 px-3 text-apple-accent">
                      {formatCurrency(tableTotalMargin)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Badge variant="accent" size="sm">
                        Portfolio Total
                      </Badge>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* EXPORT CSV MODAL WITH TEMPLATE OPTIONS                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Financial Report (CSV)"
        description="Choose export mode. Output is generated following the exact standardized enterprise template."
      >
        <div className="space-y-5">
          {/* Export Scope Selector (Option 1: Total Hubs vs Option 2: Single Hub) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Select Export Option:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Total Hubs Data */}
              <div
                onClick={() => setExportScope('total')}
                className={clsx(
                  'p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 select-none flex flex-col justify-between',
                  exportScope === 'total'
                    ? 'border-apple-accent bg-apple-accent/[0.06] shadow-apple-sm ring-1 ring-apple-accent'
                    : 'border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-apple-accent/10 text-apple-accent">
                    <Layers className="w-4 h-4" />
                  </div>
                  {exportScope === 'total' && (
                    <CheckCircle2 className="w-4 h-4 text-apple-accent" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                    Total Hubs Data
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Portfolio statement covering all registered hubs with revenue, rent, and margin columns.
                  </p>
                </div>
              </div>

              {/* Option 2: Single Hub Every Month Data */}
              <div
                onClick={() => setExportScope('single')}
                className={clsx(
                  'p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 select-none flex flex-col justify-between',
                  exportScope === 'single'
                    ? 'border-apple-accent bg-apple-accent/[0.06] shadow-apple-sm ring-1 ring-apple-accent'
                    : 'border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  {exportScope === 'single' && (
                    <CheckCircle2 className="w-4 h-4 text-apple-accent" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                    Single Hub (Entered Months Only)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Monthly financial breakdown exported only for entered months for this hub, with total summary.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional: Hub Selection dropdown if Single Hub selected */}
          {exportScope === 'single' && (
            <FormField label="Select Hub Facility" required>
              <Select
                value={selectedExportHubId}
                onChange={(e) => setSelectedExportHubId(e.target.value)}
              >
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.erpName || g.name} {g.code ? `(${g.code})` : ''} - {g.state || g.city || 'Hub'}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {/* Year Selection */}
          <FormField label="Financial Year">
            <Select
              value={exportYear}
              onChange={(e) => setExportYear(Number(e.target.value))}
            >
              <option value={2025}>2025 (FY 2025-26)</option>
              <option value={2026}>2026 (FY 2026-27)</option>
              <option value={2027}>2027 (FY 2027-28)</option>
            </Select>
          </FormField>

          {/* Template Format Details Card */}
          <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Standard Template Columns Exported:
            </span>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed font-mono">
              Vendor, Hub Status, State, Hub Model, Owner, ERP Name, Start Date, End Date, Tenure, Area, Rent, Setup Cost/Month, Electricity, WiFi, Manpower, Housekeeping, WM Refreshment/Petty Cash, Total Revenue, Rent, TDS 10%, TDS Amount, Total Rent After TDS, GST 18%, Total Rent Including GST, Electricity Bill, WiFi Bill, Sorter Payments, Petty Cash, Total, Profit, Margin, Status
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleDownloadCsv}
              icon={<Download className="w-4 h-4" />}
              className="rounded-xl shadow-apple-sm font-semibold"
            >
              {exportScope === 'total'
                ? 'Export All Hubs CSV'
                : `Export ${selectedExportGodown?.erpName || selectedExportGodown?.name || 'Hub'} CSV`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
