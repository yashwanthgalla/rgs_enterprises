import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Receipt,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import {
  Employee,
  SalaryPayment,
  EmployeeStatus,
  SalaryStatus,
  Godown,
  ApiResponse,
  PagedResponse,
} from '../types';
import { formatINR, formatDate, formatMonth } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';

export const Staff: React.FC = () => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [mainView, setMainView] = useState<'employees' | 'payroll'>('employees');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(0);

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Staff Form State
  const [staffFormData, setStaffFormData] = useState({
    godownId: '' as number | '',
    fullName: '',
    role: 'Warehouse Manager',
    phone: '',
    email: '',
    monthlySalary: 35000,
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as EmployeeStatus,
  });

  // Salary Payment Form State
  const [salaryFormData, setSalaryFormData] = useState({
    employeeId: '' as number | '',
    paymentMonth: '2026-10',
    amount: 35000,
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'PAID' as SalaryStatus,
    paymentMode: 'BANK_TRANSFER',
    transactionRef: '',
    notes: 'Salary disbursement',
  });

  // Fetch Godowns
  const { data: godowns } = useQuery({
    queryKey: ['activeGodownsDropdown'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Godown[]>>('/godowns/all');
      return res.data.data;
    },
  });

  // Fetch Employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees', selectedStatus, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, size: 15 };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      const res = await apiClient.get<ApiResponse<PagedResponse<Employee>>>('/employees', { params });
      return res.data.data;
    },
    enabled: mainView === 'employees',
  });

  // Fetch Salary Payments
  const { data: salariesData, isLoading: salariesLoading } = useQuery({
    queryKey: ['salaryPayments', page],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PagedResponse<SalaryPayment>>>('/salary-payments', {
        params: { page, size: 15 },
      });
      return res.data.data;
    },
    enabled: mainView === 'payroll',
  });

  // Add Employee Mutation
  const addStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/employees', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Staff member onboarded successfully');
      setIsAddStaffOpen(false);
      setStaffFormData({
        godownId: '',
        fullName: '',
        role: 'Warehouse Manager',
        phone: '',
        email: '',
        monthlySalary: 35000,
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to add employee');
    },
  });

  // Pay Salary Mutation
  const paySalaryMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/salary-payments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Salary disbursement recorded successfully');
      setIsPaySalaryOpen(false);
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to record salary');
    },
  });

  // Delete Employee Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Employee deleted');
    },
  });

  const handleOpenSalaryPayment = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSalaryFormData({
      employeeId: emp.id,
      paymentMonth: '2026-10',
      amount: emp.monthlySalary,
      paymentDate: new Date().toISOString().split('T')[0],
      status: 'PAID',
      paymentMode: 'BANK_TRANSFER',
      transactionRef: 'NEFT-SALARY-' + Math.floor(1000 + Math.random() * 9000),
      notes: `${emp.fullName} monthly salary`,
    });
    setIsPaySalaryOpen(true);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStaffMutation.mutate({
      ...staffFormData,
      godownId: staffFormData.godownId ? Number(staffFormData.godownId) : null,
    });
  };

  const handlePaySalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    paySalaryMutation.mutate({
      ...salaryFormData,
      employeeId: Number(salaryFormData.employeeId),
    });
  };

  // Columns for Employees
  const employeeColumns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (item) => (
        <div>
          <span className="font-semibold text-apple-text dark:text-apple-darkText block">
            {item.fullName}
          </span>
          <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
            {item.role}
          </span>
        </div>
      ),
    },
    {
      key: 'godown',
      header: 'Stationed Facility',
      render: (item) => (
        <span className="font-medium text-apple-text dark:text-apple-darkText">
          {item.godownName}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (item) => (
        <div className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          <span className="block">{item.phone || '—'}</span>
          <span className="block">{item.email || '—'}</span>
        </div>
      ),
    },
    {
      key: 'joiningDate',
      header: 'Joined Date',
      render: (item) => (
        <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {formatDate(item.joiningDate)}
        </span>
      ),
    },
    {
      key: 'monthlySalary',
      header: 'Monthly Salary',
      render: (item) => <span className="font-bold">{formatINR(item.monthlySalary)}/mo</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenSalaryPayment(item)}
            className="h-7 text-xs"
          >
            Disburse
          </Button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Remove staff record?')) deleteStaffMutation.mutate(item.id);
            }}
            className="p-1 rounded-md text-apple-secondary hover:text-apple-danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Columns for Salary Payments
  const salaryColumns: Column<SalaryPayment>[] = [
    {
      key: 'employee',
      header: 'Employee & Role',
      render: (item) => (
        <div>
          <span className="font-semibold text-apple-text dark:text-apple-darkText block">
            {item.employeeName}
          </span>
          <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
            {item.employeeRole} • {item.godownName}
          </span>
        </div>
      ),
    },
    {
      key: 'month',
      header: 'Month Cycle',
      render: (item) => (
        <span className="font-medium text-apple-text dark:text-apple-darkText">
          {formatMonth(item.paymentMonth)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (INR)',
      render: (item) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {formatINR(item.amount)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Payment Date',
      render: (item) => (
        <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {formatDate(item.paymentDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge variant={item.status === 'PAID' ? 'success' : 'warning'}>{item.status}</Badge>
      ),
    },
    {
      key: 'ref',
      header: 'Payment Mode / Ref',
      render: (item) => (
        <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {item.paymentMode} {item.transactionRef && `(${item.transactionRef})`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Workforce & Payroll
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Manage facility managers, supervisors, security staff, and monthly wage disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setIsAddStaffOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Onboard Staff
          </Button>
        </div>
      </div>

      {/* View Switcher: Staff Directory vs Payroll Ledger */}
      <SegmentedControl
        value={mainView}
        onChange={(val) => {
          setMainView(val);
          setPage(0);
        }}
        options={[
          { value: 'employees', label: 'Staff Roster', icon: <Users className="w-3.5 h-3.5" /> },
          { value: 'payroll', label: 'Salary Ledger', icon: <Receipt className="w-3.5 h-3.5" /> },
        ]}
      />

      {/* Main Table */}
      {mainView === 'employees' ? (
        <DataTable
          columns={employeeColumns}
          data={employeesData?.content || []}
          isLoading={employeesLoading}
          page={page}
          totalPages={employeesData?.totalPages || 1}
          totalElements={employeesData?.totalElements}
          onPageChange={setPage}
          emptyTitle="No staff registered"
          emptyDescription="There are no staff members currently on the roster."
        />
      ) : (
        <DataTable
          columns={salaryColumns}
          data={salariesData?.content || []}
          isLoading={salariesLoading}
          page={page}
          totalPages={salariesData?.totalPages || 1}
          totalElements={salariesData?.totalElements}
          onPageChange={setPage}
          emptyTitle="No salary disbursements"
          emptyDescription="No monthly salary payments recorded yet."
        />
      )}

      {/* Onboard Staff Sheet */}
      <Sheet
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Onboard Staff Member"
        description="Allocate personnel to an Andhra Pradesh or Telangana warehouse."
      >
        <form onSubmit={handleAddStaffSubmit} className="space-y-4">
          <FormField
            label="Full Name"
            required
            value={staffFormData.fullName}
            onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
            placeholder="e.g. S. Ramachandra Rao"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Designation / Role"
              required
              value={staffFormData.role}
              onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
              placeholder="e.g. Warehouse Manager / Security In-charge"
            />
            <FormField
              label="Stationed Facility"
              as="select"
              value={staffFormData.godownId}
              onChange={(e) => setStaffFormData({ ...staffFormData, godownId: Number(e.target.value) })}
            >
              <option value="">Unassigned</option>
              {(godowns || []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Phone Number"
              value={staffFormData.phone}
              onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
              placeholder="+91 98480 12345"
            />
            <FormField
              label="Email Address"
              type="email"
              value={staffFormData.email}
              onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
              placeholder="staff@rgsenterprises.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Monthly Salary (INR)"
              type="number"
              required
              value={staffFormData.monthlySalary}
              onChange={(e) => setStaffFormData({ ...staffFormData, monthlySalary: Number(e.target.value) })}
            />
            <FormField
              label="Joining Date"
              type="date"
              required
              value={staffFormData.joiningDate}
              onChange={(e) => setStaffFormData({ ...staffFormData, joiningDate: e.target.value })}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addStaffMutation.isPending}>
              Add Employee
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Disburse Salary Sheet */}
      <Sheet
        isOpen={isPaySalaryOpen}
        onClose={() => setIsPaySalaryOpen(false)}
        title="Disburse Monthly Salary"
        description={`${selectedEmployee?.fullName} (${selectedEmployee?.role})`}
      >
        <form onSubmit={handlePaySalarySubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Payment Month (YYYY-MM)"
              required
              value={salaryFormData.paymentMonth}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, paymentMonth: e.target.value })}
              placeholder="2026-10"
            />
            <FormField
              label="Payment Date"
              type="date"
              required
              value={salaryFormData.paymentDate}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, paymentDate: e.target.value })}
            />
          </div>

          <FormField
            label="Disbursed Amount (INR)"
            type="number"
            required
            value={salaryFormData.amount}
            onChange={(e) => setSalaryFormData({ ...salaryFormData, amount: Number(e.target.value) })}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Payment Mode"
              as="select"
              required
              value={salaryFormData.paymentMode}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, paymentMode: e.target.value })}
              options={[
                { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
                { value: 'UPI', label: 'UPI' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'CASH', label: 'Cash' },
              ]}
            />
            <FormField
              label="Transaction Ref / Voucher No"
              value={salaryFormData.transactionRef}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, transactionRef: e.target.value })}
              placeholder="e.g. NEFT-HDFC-99120"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsPaySalaryOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={paySalaryMutation.isPending}>
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

