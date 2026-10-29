import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Search,
  Filter,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { RentEntry, RentStatus, PaymentMethod, Godown, ApiResponse, PagedResponse } from '../types';
import { formatINR, formatDate, formatMonth } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';

export const RentLedger: React.FC = () => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedGodownId, setSelectedGodownId] = useState<string>('ALL');
  const [page, setPage] = useState(0);

  // Modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<RentEntry | null>(null);

  // Payment Form
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');

  // New Rent Entry Form
  const [newGodownId, setNewGodownId] = useState<number | ''>('');
  const [newRentMonth, setNewRentMonth] = useState('2026-11');
  const [newDueDate, setNewDueDate] = useState('2026-11-05');
  const [newDueAmount, setNewDueAmount] = useState<number>(200000);

  // Fetch Godowns for dropdown
  const { data: godowns } = useQuery({
    queryKey: ['activeGodownsDropdown'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Godown[]>>('/godowns/all');
      return res.data.data;
    },
  });

  // Fetch Rent Entries
  const { data: rentData, isLoading } = useQuery({
    queryKey: ['rentEntries', selectedStatus, selectedGodownId, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        size: 15,
      };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedGodownId !== 'ALL') params.godownId = selectedGodownId;

      const res = await apiClient.get<ApiResponse<PagedResponse<RentEntry>>>('/rent-entries', { params });
      return res.data.data;
    },
  });

  // Record Payment Mutation
  const payMutation = useMutation({
    mutationFn: async ({ entryId, payload }: { entryId: number; payload: any }) => {
      return apiClient.post(`/rent-entries/${entryId}/pay`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Rent payment logged successfully');
      setIsPayModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Payment recording failed');
    },
  });

  // Create Rent Entry Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/rent-entries', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Rent cycle entry created');
      setIsNewEntryModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to create rent entry');
    },
  });

  const handleOpenPay = (entry: RentEntry) => {
    setActiveEntry(entry);
    setPaidAmount(entry.dueAmount - entry.paidAmount);
    setTransactionRef('');
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry) return;

    payMutation.mutate({
      entryId: activeEntry.id,
      payload: {
        paidAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod,
        transactionRef,
      },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGodownId) {
      toastError('Please select a godown');
      return;
    }
    createMutation.mutate({
      godownId: Number(newGodownId),
      rentMonth: newRentMonth,
      dueDate: newDueDate,
      dueAmount: newDueAmount,
    });
  };

  // Columns definition
  const columns: Column<RentEntry>[] = [
    {
      key: 'facility',
      header: 'Warehouse & Tenant',
      render: (item) => (
        <div>
          <span className="font-semibold text-apple-text dark:text-apple-darkText block">
            {item.godownName}
          </span>
          <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
            {item.currentTenant || 'No Tenant'} • <span className="font-mono">{item.godownCode}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'rentMonth',
      header: 'Month Cycle',
      render: (item) => (
        <span className="font-medium text-apple-text dark:text-apple-darkText">
          {formatMonth(item.rentMonth)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (item) => (
        <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due (INR)',
      render: (item) => <span className="font-semibold">{formatINR(item.dueAmount)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Collected (INR)',
      render: (item) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatINR(item.paidAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge
          variant={
            item.status === 'PAID'
              ? 'success'
              : item.status === 'OVERDUE'
              ? 'danger'
              : 'warning'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'paymentDetails',
      header: 'Ref / Method',
      render: (item) => (
        <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {item.transactionRef || item.paymentMethod || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'text-right',
      render: (item) => (
        <div className="text-right">
          {item.status !== 'PAID' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenPay(item)}
              className="h-7 text-xs"
            >
              Record Payment
            </Button>
          ) : (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Rent Roll & Collections
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Track monthly tenant dues, collections, and security deposits across all properties.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsNewEntryModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Create Rent Entry
        </Button>
      </div>

      {/* Security Advance Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Portfolio Security Advances
          </span>
          <p className="text-xl font-bold text-apple-text dark:text-apple-darkText mt-0.5">
            {formatINR(
              (godowns || []).reduce((acc, curr) => acc + (curr.securityAdvance || 0), 0)
            )}
          </p>
          <span className="text-xs text-apple-secondary mt-1 block">
            Refundable deposits held separately from expenses
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Total Active Monthly Roll
          </span>
          <p className="text-xl font-bold text-apple-accent mt-0.5">
            {formatINR((godowns || []).reduce((acc, curr) => acc + (curr.monthlyRent || 0), 0))}
          </p>
          <span className="text-xs text-apple-secondary mt-1 block">
            Across {(godowns || []).filter((g) => g.status === 'ACTIVE').length} leased warehouses
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Active Filter Records
          </span>
          <p className="text-xl font-bold text-apple-text dark:text-apple-darkText mt-0.5">
            {rentData?.totalElements || 0} Entries
          </p>
          <span className="text-xs text-apple-secondary mt-1 block">
            Historical & current ledger transactions
          </span>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SegmentedControl
          value={selectedStatus}
          onChange={(val) => {
            setSelectedStatus(val);
            setPage(0);
          }}
          options={[
            { value: 'ALL', label: 'All Dues' },
            { value: 'OVERDUE', label: 'Overdue' },
            { value: 'DUE', label: 'Due Soon' },
            { value: 'PAID', label: 'Paid & Cleared' },
          ]}
        />

        <div className="flex items-center gap-2">
          <select
            value={selectedGodownId}
            onChange={(e) => {
              setSelectedGodownId(e.target.value);
              setPage(0);
            }}
            className="px-3.5 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-xs text-apple-text dark:text-apple-darkText focus:outline-none focus:ring-2 focus:ring-apple-accent/20"
          >
            <option value="ALL">All Warehouses</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Ledger DataTable */}
      <DataTable
        columns={columns}
        data={rentData?.content || []}
        isLoading={isLoading}
        page={page}
        totalPages={rentData?.totalPages || 1}
        totalElements={rentData?.totalElements}
        onPageChange={setPage}
        emptyTitle="No rent entries found"
        emptyDescription="There are no rent ledger records for the selected filters."
      />

      {/* Record Payment Sheet */}
      <Sheet
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Rent Payment"
        description={`${activeEntry?.godownName} • Cycle: ${activeEntry?.rentMonth}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <FormField
            label="Payment Amount (INR)"
            type="number"
            required
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
            hint={`Total Due: ${formatINR(activeEntry?.dueAmount)} | Already Paid: ${formatINR(activeEntry?.paidAmount)}`}
          />

          <FormField
            label="Payment Mode"
            as="select"
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
              { value: 'UPI', label: 'UPI' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'CASH', label: 'Cash' },
            ]}
          />

          <FormField
            label="Transaction Reference / Cheque No"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. CMS-FLIPKART-9912"
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={payMutation.isPending}>
              Submit Payment
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Create Rent Cycle Sheet */}
      <Sheet
        isOpen={isNewEntryModalOpen}
        onClose={() => setIsNewEntryModalOpen(false)}
        title="Generate Rent Ledger Entry"
        description="Add a monthly rent obligation for a leased warehouse."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <FormField
            label="Warehouse Facility"
            as="select"
            required
            value={newGodownId}
            onChange={(e) => {
              const gid = Number(e.target.value);
              setNewGodownId(gid);
              const found = (godowns || []).find((g) => g.id === gid);
              if (found) setNewDueAmount(found.monthlyRent);
            }}
          >
            <option value="">Select Facility...</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} - {g.currentTenant || 'Vacant'} ({formatINR(g.monthlyRent)}/mo)
              </option>
            ))}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Rent Month (YYYY-MM)"
              required
              value={newRentMonth}
              onChange={(e) => setNewRentMonth(e.target.value)}
              placeholder="2026-11"
            />
            <FormField
              label="Due Date"
              type="date"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
          </div>

          <FormField
            label="Due Amount (INR)"
            type="number"
            required
            value={newDueAmount}
            onChange={(e) => setNewDueAmount(Number(e.target.value))}
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsNewEntryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              Create Entry
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

