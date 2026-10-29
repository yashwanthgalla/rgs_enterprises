import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Trash2,
  Calendar,
  Filter,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import {
  Expense,
  ExpenseCategory,
  ExpenseResponsibility,
  ExpenseStatus,
  Godown,
  ApiResponse,
  PagedResponse,
} from '../types';
import { formatINR, formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';

export const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedResp, setSelectedResp] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);

  // Pay Form
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');

  // Add Expense Form
  const [formData, setFormData] = useState({
    godownId: '' as number | '',
    category: 'ELECTRICITY' as ExpenseCategory,
    title: '',
    amount: 15000,
    responsibility: 'COMPANY' as ExpenseResponsibility,
    status: 'PENDING' as ExpenseStatus,
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  // Fetch Godowns for dropdown
  const { data: godowns } = useQuery({
    queryKey: ['activeGodownsDropdown'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Godown[]>>('/godowns/all');
      return res.data.data;
    },
  });

  // Fetch Expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', selectedStatus, selectedResp, selectedCategory, searchQuery, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        size: 15,
      };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedResp !== 'ALL') params.responsibility = selectedResp;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery) params.query = searchQuery;

      const res = await apiClient.get<ApiResponse<PagedResponse<Expense>>>('/expenses', { params });
      return res.data.data;
    },
  });

  // Pay Expense Mutation
  const payMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      return apiClient.post(`/expenses/${id}/pay`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Expense marked as PAID');
      setIsPayModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update expense');
    },
  });

  // Add Expense Mutation
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Expense / bill logged successfully');
      setIsAddModalOpen(false);
      setFormData({
        godownId: '',
        category: 'ELECTRICITY',
        title: '',
        amount: 15000,
        responsibility: 'COMPANY',
        status: 'PENDING',
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        notes: '',
      });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to create expense');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Expense deleted');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to delete');
    },
  });

  const handleOpenPay = (exp: Expense) => {
    setActiveExpense(exp);
    setTransactionRef('');
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExpense) return;
    payMutation.mutate({
      id: activeExpense.id,
      payload: {
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod,
        transactionRef,
      },
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.godownId) {
      toastError('Please select a godown facility');
      return;
    }
    addMutation.mutate({
      ...formData,
      godownId: Number(formData.godownId),
    });
  };

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Expense & Facility',
      render: (item) => (
        <div>
          <span className="font-semibold text-apple-text dark:text-apple-darkText block">
            {item.title}
          </span>
          <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
            {item.godownName} • <span className="font-mono">{item.godownCode}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <Badge variant="neutral">{item.category}</Badge>,
    },
    {
      key: 'amount',
      header: 'Amount (INR)',
      render: (item) => <span className="font-bold">{formatINR(item.amount)}</span>,
    },
    {
      key: 'responsibility',
      header: 'Responsibility',
      render: (item) => (
        <Badge variant={item.responsibility === 'COMPANY' ? 'neutral' : 'info'}>
          {item.responsibility}
        </Badge>
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
              : item.status === 'RECEIVABLE'
              ? 'info'
              : 'warning'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'dates',
      header: 'Due / Paid Date',
      render: (item) => (
        <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {item.paymentDate ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              Paid {formatDate(item.paymentDate)}
            </span>
          ) : item.dueDate ? (
            <span>Due {formatDate(item.dueDate)}</span>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          {item.status !== 'PAID' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenPay(item)}
              className="h-7 text-xs"
            >
              Mark Paid
            </Button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this expense bill?')) deleteMutation.mutate(item.id);
            }}
            className="p-1 rounded-md text-apple-secondary hover:text-apple-danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Operating Expenses & Utility Bills
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Track utility bills, property taxes, maintenance contracts, and tenant reimbursements.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Log Expense / Bill
        </Button>
      </div>

      {/* Filter Bars */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Segmented Control */}
        <SegmentedControl
          value={selectedStatus}
          onChange={(val) => {
            setSelectedStatus(val);
            setPage(0);
          }}
          options={[
            { value: 'ALL', label: 'All Bills' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'RECEIVABLE', label: 'Receivable (Tenant)' },
            { value: 'PAID', label: 'Paid' },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Responsibility Filter */}
          <select
            value={selectedResp}
            onChange={(e) => {
              setSelectedResp(e.target.value);
              setPage(0);
            }}
            className="px-3.5 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-xs text-apple-text dark:text-apple-darkText focus:outline-none focus:ring-2 focus:ring-apple-accent/20"
          >
            <option value="ALL">All Responsibilities</option>
            <option value="COMPANY">Company Paid</option>
            <option value="TENANT">Tenant Reimbursable</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(0);
            }}
            className="px-3.5 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-xs text-apple-text dark:text-apple-darkText focus:outline-none focus:ring-2 focus:ring-apple-accent/20"
          >
            <option value="ALL">All Categories</option>
            <option value="ELECTRICITY">Electricity (EB)</option>
            <option value="PROPERTY_TAX">Property Tax</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="SECURITY">Security</option>
            <option value="INTERNET">Internet</option>
            <option value="INSURANCE">Insurance</option>
            <option value="WATER">Water</option>
            <option value="REPAIRS">Repairs</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={expensesData?.content || []}
        isLoading={isLoading}
        searchPlaceholder="Search bills by title..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        page={page}
        totalPages={expensesData?.totalPages || 1}
        totalElements={expensesData?.totalElements}
        onPageChange={setPage}
        emptyTitle="No expenses found"
        emptyDescription="There are no expense records matching your active filters."
      />

      {/* Mark Paid Modal */}
      <Sheet
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Mark Bill as Paid"
        description={`${activeExpense?.title} • Amount: ${formatINR(activeExpense?.amount)}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <FormField
            label="Payment Mode"
            as="select"
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
              { value: 'UPI', label: 'UPI' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'CASH', label: 'Cash' },
            ]}
          />

          <FormField
            label="Payment / Transaction Reference"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. CMS-TAX-99120"
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={payMutation.isPending}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Add Expense Sheet */}
      <Sheet
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Operating Expense / Bill"
        description="Add a utility bill, maintenance service invoice, or municipal tax."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <FormField
            label="Warehouse Facility"
            as="select"
            required
            value={formData.godownId}
            onChange={(e) => setFormData({ ...formData, godownId: Number(e.target.value) })}
          >
            <option value="">Select Facility...</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Category"
              as="select"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              options={[
                { value: 'ELECTRICITY', label: 'Electricity (EB)' },
                { value: 'PROPERTY_TAX', label: 'Property Tax' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
                { value: 'SECURITY', label: 'Security' },
                { value: 'INTERNET', label: 'Internet / WiFi' },
                { value: 'INSURANCE', label: 'Insurance' },
                { value: 'WATER', label: 'Water' },
                { value: 'REPAIRS', label: 'Repairs' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />

            <FormField
              label="Responsibility"
              as="select"
              required
              value={formData.responsibility}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  responsibility: e.target.value as ExpenseResponsibility,
                  status: e.target.value === 'TENANT' ? 'RECEIVABLE' : 'PENDING',
                })
              }
              options={[
                { value: 'COMPANY', label: 'Company (Owner)' },
                { value: 'TENANT', label: 'Tenant (Reimbursable)' },
              ]}
            />
          </div>

          <FormField
            label="Bill / Invoice Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. TSSPDCL Commercial Power Bill Nov"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Amount (INR)"
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            />
            <FormField
              label="Status"
              as="select"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ExpenseStatus })}
              options={[
                { value: 'PENDING', label: 'Pending' },
                { value: 'RECEIVABLE', label: 'Receivable' },
                { value: 'PAID', label: 'Paid' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Bill Date"
              type="date"
              required
              value={formData.billDate}
              onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
            />
            <FormField
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <FormField
            label="Notes / Consumer Number"
            as="textarea"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Consumer USC number, contractor contact, or invoice reference..."
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addMutation.isPending}>
              Save Expense
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

