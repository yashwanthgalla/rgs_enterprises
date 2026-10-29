import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Warehouse,
  MapPin,
  Maximize2,
  Calendar,
  User,
  ArrowLeft,
  Receipt,
  CreditCard,
  Wrench,
  Users,
  FolderOpen,
  Plus,
  CheckCircle2,
  Download,
  Upload,
  AlertCircle,
  Phone,
  Mail,
  Shield,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import {
  GodownSummary,
  RentEntry,
  Asset,
  Employee,
  Expense,
  ExpenseCategory,
  ExpenseResponsibility,
  DocumentItem,
  ApiResponse,
  PaymentMethod,
} from '../types';
import { formatINR, formatSqft, formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { useToast } from '../components/ui/Toast';

export const GodownDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedRentEntry, setSelectedRentEntry] = useState<RentEntry | null>(null);
  const [rentPaymentAmount, setRentPaymentAmount] = useState<number>(0);
  const [rentPaymentMethod, setRentPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [rentTransactionRef, setRentTransactionRef] = useState('');

  // Expense Modals State
  const [isExpensePayModalOpen, setIsExpensePayModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [expenseTransactionRef, setExpenseTransactionRef] = useState('');

  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('ELECTRICITY');
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number>(10000);
  const [newExpenseResp, setNewExpenseResp] = useState<ExpenseResponsibility>('COMPANY');
  const [newExpenseDueDate, setNewExpenseDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [newExpenseNotes, setNewExpenseNotes] = useState('');

  // 1. Fetch Godown Summary
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['godownSummary', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<GodownSummary>>(`/godowns/${id}/summary`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // 2. Fetch Godown Rent entries
  const { data: rentEntries } = useQuery({
    queryKey: ['godownRentEntries', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RentEntry[]>>(`/rent-entries/godown/${id}`);
      return res.data.data;
    },
    enabled: !!id && activeTab === 'rent',
  });

  // 3. Fetch Godown Assets
  const { data: assets } = useQuery({
    queryKey: ['godownAssets', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Asset[]>>(`/assets/godown/${id}`);
      return res.data.data;
    },
    enabled: !!id && activeTab === 'assets',
  });

  // 4. Fetch Godown Staff
  const { data: staff } = useQuery({
    queryKey: ['godownStaff', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Employee[]>>(`/employees/godown/${id}`);
      return res.data.data;
    },
    enabled: !!id && activeTab === 'staff',
  });

  // 5. Fetch Godown Expenses
  const { data: expenses } = useQuery({
    queryKey: ['godownExpenses', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Expense[]>>(`/expenses/godown/${id}`);
      return res.data.data;
    },
    enabled: !!id && activeTab === 'expenses',
  });

  // 6. Fetch Godown Documents
  const { data: documents } = useQuery({
    queryKey: ['godownDocuments', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<DocumentItem[]>>(`/documents/godown/${id}`);
      return res.data.data;
    },
    enabled: !!id && activeTab === 'documents',
  });

  // Record Rent Payment Mutation
  const rentPaymentMutation = useMutation({
    mutationFn: async ({ entryId, payload }: { entryId: number; payload: any }) => {
      return apiClient.post(`/rent-entries/${entryId}/pay`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Rent payment recorded successfully');
      setIsRentModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to record payment');
    },
  });

  // Record Expense / Bill Payment Mutation
  const payExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, payload }: { expenseId: number; payload: any }) => {
      return apiClient.post(`/expenses/${expenseId}/pay`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Facility bill marked as PAID');
      setIsExpensePayModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update bill payment');
    },
  });

  // Add Expense / Bill Mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Facility bill logged successfully');
      setIsAddExpenseModalOpen(false);
      setNewExpenseTitle('');
      setNewExpenseAmount(10000);
      setNewExpenseNotes('');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to create bill');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 bg-black/5 dark:bg-white/5 rounded-full animate-pulse" />
        <div className="h-48 bg-black/5 dark:bg-white/5 rounded-apple-lg animate-pulse" />
      </div>
    );
  }

  if (!summaryData) {
    return (
      <Card className="text-center py-16">
        <p className="text-apple-secondary">Facility not found.</p>
        <Button variant="ghost" onClick={() => navigate('/godowns')} className="mt-4">
          Back to Godowns
        </Button>
      </Card>
    );
  }

  const { godown } = summaryData;

  const handleOpenRentPay = (entry: RentEntry) => {
    setSelectedRentEntry(entry);
    setRentPaymentAmount(entry.dueAmount - entry.paidAmount);
    setRentTransactionRef('');
    setIsRentModalOpen(true);
  };

  const handlePayRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentEntry) return;

    rentPaymentMutation.mutate({
      entryId: selectedRentEntry.id,
      payload: {
        paidAmount: rentPaymentAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: rentPaymentMethod,
        transactionRef: rentTransactionRef,
        notes: 'Recorded from Godown Hub',
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button & Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/godowns')}
            className="h-8 w-8 p-0 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
                {godown.name}
              </h1>
              <Badge
                variant={
                  godown.status === 'ACTIVE'
                    ? 'success'
                    : godown.status === 'VACANT'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {godown.status}
              </Badge>
            </div>
            <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary flex items-center gap-2 mt-0.5">
              <span className="font-mono">{godown.code}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {godown.city}, {godown.state} - {godown.pincode}
              </span>
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-apple-secondary dark:text-apple-darkSecondary">
              <span className="inline-flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-apple-accent" />
                Last edited by: <strong className="text-apple-text dark:text-apple-darkText">{godown.lastEditedBy || 'admin'}</strong>
              </span>
              <span>•</span>
              <span>Updated {formatDate(godown.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActiveTab('documents');
            }}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Floor Area
          </span>
          <p className="text-base sm:text-lg font-bold text-apple-text dark:text-apple-darkText mt-0.5">
            {formatSqft(godown.sizeSqft)}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Monthly Rent
          </span>
          <p className="text-base sm:text-lg font-bold text-apple-accent mt-0.5">
            {formatINR(godown.monthlyRent)}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Security Advance
          </span>
          <p className="text-base sm:text-lg font-bold text-apple-text dark:text-apple-darkText mt-0.5">
            {formatINR(godown.securityAdvance)}
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-[10px] uppercase font-semibold text-apple-secondary dark:text-apple-darkSecondary">
            Pending Facility Bills
          </span>
          <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {formatINR(summaryData.pendingBillsAmount)}
          </p>
        </Card>
      </div>

      {/* Sub-pane Navigation Segmented Control */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'overview', label: 'Overview & Lease' },
            { value: 'rent', label: 'Rent Ledger', count: rentEntries?.length },
            { value: 'expenses', label: 'Bills & Expenses', count: expenses?.length },
            { value: 'assets', label: 'Equipment Register', count: summaryData.totalAssets },
            { value: 'staff', label: 'Stationed Staff', count: summaryData.totalStaff },
            { value: 'documents', label: 'Documents Vault', count: documents?.length },
          ]}
        />
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lease & Tenant Details */}
          <Card>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-darkText mb-4 pb-2 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center gap-2">
              <User className="w-4 h-4 text-apple-accent" /> Lease & Lessee Information
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-black/[0.02] dark:border-white/[0.04]">
                <span className="text-apple-secondary dark:text-apple-darkSecondary">Current Tenant:</span>
                <span className="font-semibold text-apple-text dark:text-apple-darkText">
                  {godown.currentTenant || 'None (Vacant)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.02] dark:border-white/[0.04]">
                <span className="text-apple-secondary dark:text-apple-darkSecondary">Contact Phone:</span>
                <span className="font-medium text-apple-text dark:text-apple-darkText flex items-center gap-1">
                  {godown.tenantPhone ? (
                    <>
                      <Phone className="w-3 h-3" /> {godown.tenantPhone}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.02] dark:border-white/[0.04]">
                <span className="text-apple-secondary dark:text-apple-darkSecondary">Contact Email:</span>
                <span className="font-medium text-apple-text dark:text-apple-darkText flex items-center gap-1">
                  {godown.tenantEmail ? (
                    <>
                      <Mail className="w-3 h-3" /> {godown.tenantEmail}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.02] dark:border-white/[0.04]">
                <span className="text-apple-secondary dark:text-apple-darkSecondary">Lease Period:</span>
                <span className="font-medium text-apple-text dark:text-apple-darkText">
                  {godown.leaseStartDate ? formatDate(godown.leaseStartDate) : '—'} to{' '}
                  {godown.leaseEndDate ? formatDate(godown.leaseEndDate) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/[0.02] dark:border-white/[0.04]">
                <span className="text-apple-secondary dark:text-apple-darkSecondary">Security Deposit:</span>
                <span className="font-bold text-apple-text dark:text-apple-darkText">
                  {formatINR(godown.securityAdvance)}
                </span>
              </div>
            </div>
          </Card>

          {/* Physical Specifications & Notes */}
          <Card>
            <h3 className="text-sm font-semibold text-apple-text dark:text-apple-darkText mb-4 pb-2 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-apple-accent" /> Facility Specifications & Notes
            </h3>
            <div className="space-y-3 text-xs">
              <div className="py-1">
                <span className="text-apple-secondary dark:text-apple-darkSecondary block text-[10px] uppercase font-semibold">
                  Physical Location
                </span>
                <p className="font-medium text-apple-text dark:text-apple-darkText mt-0.5">
                  {godown.address}
                </p>
              </div>
              <div className="py-1 pt-2 border-t border-black/[0.02] dark:border-white/[0.04]">
                <span className="text-apple-secondary dark:text-apple-darkSecondary block text-[10px] uppercase font-semibold">
                  Internal Notes & Amenities
                </span>
                <p className="font-medium text-apple-text dark:text-apple-darkText mt-0.5 whitespace-pre-wrap">
                  {godown.notes || 'No specific notes recorded for this warehouse facility.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rent Ledger Tab */}
      {activeTab === 'rent' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-apple-text dark:text-apple-darkText">
                Facility Rent Roll
              </h3>
              <p className="text-xs text-apple-secondary">Historical rent cycle ledger</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-apple-secondary">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Due Amount</th>
                  <th className="py-2.5 px-3">Paid Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Payment Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {(rentEntries || []).map((rent) => (
                  <tr key={rent.id} className="hover:bg-black/[0.01]">
                    <td className="py-3 px-3 font-semibold">{rent.rentMonth}</td>
                    <td className="py-3 px-3 text-apple-secondary">{formatDate(rent.dueDate)}</td>
                    <td className="py-3 px-3 font-medium">{formatINR(rent.dueAmount)}</td>
                    <td className="py-3 px-3 font-medium text-emerald-600">{formatINR(rent.paidAmount)}</td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          rent.status === 'PAID'
                            ? 'success'
                            : rent.status === 'OVERDUE'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {rent.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-apple-secondary">
                      {rent.paymentDate ? formatDate(rent.paymentDate) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {rent.status !== 'PAID' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenRentPay(rent)}
                          className="h-7 text-xs"
                        >
                          Record Payment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Equipment Register Tab */}
      {activeTab === 'assets' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-apple-text dark:text-apple-darkText">
                Equipment & Asset Register
              </h3>
              <p className="text-xs text-apple-secondary">Registered inventory at this location</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(assets || []).map((asset) => (
              <div
                key={asset.id}
                className="p-4 rounded-xl bg-apple-bg dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-apple-text dark:text-apple-darkText">
                    {asset.name}
                  </h4>
                  <Badge variant="neutral">{asset.condition}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-apple-secondary">
                  <div>Category: <span className="text-apple-text font-medium">{asset.category}</span></div>
                  <div>Quantity: <span className="text-apple-text font-medium">{asset.quantity}</span></div>
                  <div>Cost: <span className="text-apple-text font-medium">{formatINR(asset.cost)}</span></div>
                  <div>Warranty Expiry: <span className="text-apple-text font-medium">{formatDate(asset.warrantyExpiryDate)}</span></div>
                </div>
                {asset.notes && <p className="text-[11px] text-apple-secondary pt-1 border-t">{asset.notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stationed Staff Tab */}
      {activeTab === 'staff' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-apple-text dark:text-apple-darkText">
                Stationed Workforce
              </h3>
              <p className="text-xs text-apple-secondary">Personnel allocated to this warehouse</p>
            </div>
          </div>

          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
            {(staff || []).map((emp) => (
              <div key={emp.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-semibold text-apple-text dark:text-apple-darkText">
                    {emp.fullName}
                  </h4>
                  <p className="text-apple-secondary">
                    {emp.role} • Joined {formatDate(emp.joiningDate)}
                  </p>
                  <p className="text-apple-secondary mt-0.5">{emp.phone} • {emp.email}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-apple-text dark:text-apple-darkText block">
                    {formatINR(emp.monthlySalary)}/mo
                  </span>
                  <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'neutral'} className="mt-1">
                    {emp.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Operating Expenses Tab */}
      {activeTab === 'expenses' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-sm text-apple-text dark:text-apple-darkText">
                Facility Operating Bills & Expenses
              </h3>
              <p className="text-xs text-apple-secondary">Electricity, Internet, Taxes, Maintenance & Repairs</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsAddExpenseModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Facility Bill
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] text-apple-secondary">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Responsibility</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {(expenses || []).map((exp) => (
                  <tr key={exp.id} className="hover:bg-black/[0.01]">
                    <td className="py-3 px-3 font-semibold">{exp.title}</td>
                    <td className="py-3 px-3">{exp.category}</td>
                    <td className="py-3 px-3 font-bold">{formatINR(exp.amount)}</td>
                    <td className="py-3 px-3">
                      <Badge variant={exp.responsibility === 'COMPANY' ? 'neutral' : 'info'}>
                        {exp.responsibility}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          exp.status === 'PAID'
                            ? 'success'
                            : exp.status === 'RECEIVABLE'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-apple-secondary">{formatDate(exp.dueDate)}</td>
                    <td className="py-3 px-3 text-right">
                      {exp.status !== 'PAID' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-7 text-xs px-2.5"
                          onClick={() => {
                            setSelectedExpense(exp);
                            setExpenseTransactionRef('');
                            setIsExpensePayModalOpen(true);
                          }}
                          icon={<CreditCard className="w-3 h-3" />}
                        >
                          Record Payment
                        </Button>
                      ) : (
                        <span className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-apple-success" />
                          Paid {exp.paymentDate ? formatDate(exp.paymentDate) : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Documents Vault Tab */}
      {activeTab === 'documents' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-apple-text dark:text-apple-darkText">
                Attached Documents
              </h3>
              <p className="text-xs text-apple-secondary">Lease deeds, property papers, tax bills</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/documents')}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              Upload to Vault
            </Button>
          </div>

          {(documents || []).length === 0 ? (
            <p className="text-xs text-apple-secondary py-6 text-center">
              No files currently attached to this facility.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(documents || []).map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06] bg-apple-bg dark:bg-white/[0.02] flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-apple-text truncate">{doc.fileName}</p>
                    <span className="text-[10px] text-apple-secondary">
                      {doc.documentType} • {(doc.fileSize / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <a
                    href={`http://localhost:8080/api/v1/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-apple-accent"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Record Rent Payment Modal Sheet */}
      <Sheet
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        title="Record Rent Payment"
        description={`Facility: ${godown.name} (${selectedRentEntry?.rentMonth})`}
      >
        <form onSubmit={handlePayRentSubmit} className="space-y-4">
          <FormField
            label="Payment Amount (INR)"
            type="number"
            required
            value={rentPaymentAmount}
            onChange={(e) => setRentPaymentAmount(Number(e.target.value))}
          />

          <FormField
            label="Payment Mode"
            as="select"
            required
            value={rentPaymentMethod}
            onChange={(e) => setRentPaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
              { value: 'UPI', label: 'UPI Instant Payment' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'CASH', label: 'Cash' },
            ]}
          />

          <FormField
            label="Transaction Reference / Cheque No"
            value={rentTransactionRef}
            onChange={(e) => setRentTransactionRef(e.target.value)}
            placeholder="e.g. CMS-FLIPKART-8821"
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsRentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={rentPaymentMutation.isPending}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Record Bill Payment Modal Sheet */}
      <Sheet
        isOpen={isExpensePayModalOpen}
        onClose={() => setIsExpensePayModalOpen(false)}
        title="Record Bill Payment"
        description={`Mark bill as PAID for ${godown.name}: ${selectedExpense?.title} (${selectedExpense ? formatINR(selectedExpense.amount) : ''})`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedExpense) return;
            payExpenseMutation.mutate({
              expenseId: selectedExpense.id,
              payload: {
                paymentDate: new Date().toISOString().split('T')[0],
                paymentMethod: expensePaymentMethod,
                transactionRef: expenseTransactionRef,
                notes: 'Settled via Facility Hub',
              },
            });
          }}
          className="space-y-4"
        >
          <div className="p-3.5 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl flex justify-between items-center text-xs">
            <div>
              <p className="font-semibold text-apple-text dark:text-apple-darkText">{selectedExpense?.title}</p>
              <p className="text-apple-secondary">{selectedExpense?.category} • {selectedExpense?.responsibility}</p>
            </div>
            <p className="text-base font-bold text-apple-accent">
              {selectedExpense ? formatINR(selectedExpense.amount) : ''}
            </p>
          </div>

          <FormField
            label="Payment Mode"
            as="select"
            required
            value={expensePaymentMethod}
            onChange={(e) => setExpensePaymentMethod(e.target.value as PaymentMethod)}
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
              { value: 'UPI', label: 'UPI Instant Payment' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'CASH', label: 'Cash' },
            ]}
          />

          <FormField
            label="Transaction Reference / Cheque No"
            value={expenseTransactionRef}
            onChange={(e) => setExpenseTransactionRef(e.target.value)}
            placeholder="e.g. UTR-994827103"
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsExpensePayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={payExpenseMutation.isPending}>
              Confirm Bill Payment
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Add Facility Bill / Expense Modal Sheet */}
      <Sheet
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        title="Add Facility Bill / Expense"
        description={`Log an operational expense or utility bill for ${godown.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!id) return;
            addExpenseMutation.mutate({
              godownId: Number(id),
              category: newExpenseCategory,
              title: newExpenseTitle,
              amount: newExpenseAmount,
              responsibility: newExpenseResp,
              status: 'PENDING',
              billDate: new Date().toISOString().split('T')[0],
              dueDate: newExpenseDueDate,
              notes: newExpenseNotes,
            });
          }}
          className="space-y-4"
        >
          <FormField
            label="Bill / Expense Title"
            required
            placeholder="e.g. Electricity Bill - Oct 2026"
            value={newExpenseTitle}
            onChange={(e) => setNewExpenseTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Category"
              as="select"
              required
              value={newExpenseCategory}
              onChange={(e) => setNewExpenseCategory(e.target.value as ExpenseCategory)}
              options={[
                { value: 'ELECTRICITY', label: 'Electricity' },
                { value: 'WATER', label: 'Water Supply' },
                { value: 'INTERNET', label: 'Internet / Telecom' },
                { value: 'PROPERTY_TAX', label: 'Property Tax' },
                { value: 'MAINTENANCE', label: 'Facility Maintenance' },
                { value: 'SECURITY', label: 'Security Services' },
                { value: 'INSURANCE', label: 'Property Insurance' },
                { value: 'REPAIRS', label: 'Civil / Structural Repairs' },
                { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
              ]}
            />

            <FormField
              label="Amount (INR)"
              type="number"
              required
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Responsibility"
              as="select"
              required
              value={newExpenseResp}
              onChange={(e) => setNewExpenseResp(e.target.value as ExpenseResponsibility)}
              options={[
                { value: 'COMPANY', label: 'Company (Owner Expense)' },
                { value: 'TENANT', label: 'Tenant (Reimbursable)' },
              ]}
            />

            <FormField
              label="Due Date"
              type="date"
              required
              value={newExpenseDueDate}
              onChange={(e) => setNewExpenseDueDate(e.target.value)}
            />
          </div>

          <FormField
            label="Notes / Meter Reading"
            as="textarea"
            rows={2}
            placeholder="e.g. Discom Consumer No: 882194, Units consumed: 4120"
            value={newExpenseNotes}
            onChange={(e) => setNewExpenseNotes(e.target.value)}
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addExpenseMutation.isPending}>
              Create Bill
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

