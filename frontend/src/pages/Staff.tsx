import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryClient, STALE_TIMES } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  DollarSign,
  CreditCard,
  Trash2,
  Building,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, godownApi, salaryApi } from '../services/api';
import { Staff, Godown } from '../types';

export const StaffDirectory: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isViewer = user?.role === 'VIEWER';
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');

  // Long-lived Hub dropdown list
  const hubsQuery = useQuery({
    queryKey: queryKeys.hubs.compact(),
    queryFn: async () => {
      const gRes = await godownApi.getAllList().catch(() => godownApi.getAll(0, 100));
      return Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];
    },
    staleTime: STALE_TIMES.LONG_LIVED,
  });
  const godowns: Godown[] = hubsQuery.data || [];

  // Staff list query with keepPreviousData
  const staffQuery = useQuery({
    queryKey: queryKeys.staff.list(),
    queryFn: async () => {
      const sRes = await employeeApi.getAll({ size: 100 });
      return Array.isArray(sRes) ? sRes : (sRes as any)?.content || [];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
  const staffList: Staff[] = staffQuery.data || [];
  const loading = staffQuery.isLoading && !staffQuery.data;

  // Add / Edit Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    role: '',
    phoneNumber: '',
    email: '',
    monthlySalary: '',
    godownId: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    status: 'ACTIVE',
  });

  // Disburse Salary Modal
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryData, setSalaryData] = useState({
    amount: '',
    paymentMonth: new Date().toISOString().slice(0, 7),
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BANK_TRANSFER',
  });

  // Delete Staff Modal
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      fullName: '',
      role: '',
      phoneNumber: '',
      email: '',
      monthlySalary: '',
      godownId: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      fullName: staff.fullName || '',
      role: staff.role || '',
      phoneNumber: staff.phoneNumber || staff.phone || '',
      email: staff.email || '',
      monthlySalary: String(staff.monthlySalary ?? ''),
      godownId: staff.godownId ? String(staff.godownId) : '',
      joiningDate: staff.joiningDate || new Date().toISOString().slice(0, 10),
      status: staff.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.role.trim() || !formData.phoneNumber.trim() || !formData.monthlySalary) {
      error('Please fill required fields (Full Name, Role / Designation, Phone, Salary)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        role: formData.role.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        phone: formData.phoneNumber.trim(),
        email: formData.email.trim() || null,
        monthlySalary: Number(formData.monthlySalary),
        godownId: formData.godownId ? Number(formData.godownId) : null,
        joiningDate: formData.joiningDate,
        status: formData.status,
      };

      if (editingStaff) {
        await employeeApi.update(editingStaff.id, payload);
        success('Staff member updated successfully');
      } else {
        await employeeApi.create(payload);
        success('Staff member registered');
      }

      setIsModalOpen(false);
      setEditingStaff(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Operation failed: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setSubmitting(true);
    try {
      await salaryApi.create({
        employeeId: selectedStaff.id,
        amount: Number(salaryData.amount),
        month: salaryData.paymentMonth,
        paymentDate: salaryData.paymentDate,
        paymentMethod: salaryData.paymentMethod,
        status: 'PAID',
      });

      success(`Salary disbursed for ${selectedStaff.fullName}`);
      setIsSalaryModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.salaries() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Failed to record salary: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      await employeeApi.delete(staffToDelete.id);
      success(`Staff member "${staffToDelete.fullName}" removed successfully`);
      setStaffToDelete(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Failed to delete staff: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPayroll = staffList.reduce((acc, s) => acc + (s.monthlySalary || 0), 0);

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    const hub = godowns.find((g) => g.id === s.godownId);
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.phoneNumber.includes(q) ||
      (s.godownCode && s.godownCode.toLowerCase().includes(q)) ||
      (hub?.code && hub.code.toLowerCase().includes(q)) ||
      (s.godownName && s.godownName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Personnel & Security Directory
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Supervisors, 24/7 security guards, maintenance crew, and payroll dispatches
          </p>
        </div>

          {!isViewer && (
            <Button
              onClick={openCreateModal}
              icon={<Plus className="w-4 h-4" />}
              className="rounded-xl shadow-apple-sm"
            >
              Add Staff Member
            </Button>
          )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : ''} gap-4`}>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Active Staff</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{staffList.length} Personnel</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-accent/10 text-apple-accent">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        {isAdmin && (
          <Card className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Monthly Payroll Obligation</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(totalPayroll)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-apple-success/10 text-apple-success">
              <DollarSign className="w-5 h-5" />
            </div>
          </Card>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Input
          placeholder="Search by staff name, designation, or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">
          Loading staff directory...
        </div>
      ) : filteredStaff.length === 0 ? (
        <Card className="p-10 text-center text-xs text-gray-400">
          No personnel recorded. Add your security team and warehouse staff.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <Card key={staff.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{staff.fullName}</h3>
                    <p className="text-xs text-apple-accent font-medium mt-0.5">{staff.role}</p>
                  </div>
                  <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                    {staff.status}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{staff.phoneNumber}</span>
                  </p>
                  {staff.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{staff.email}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {staff.godownId
                        ? `[${staff.godownCode || (godowns.find((g) => g.id === staff.godownId)?.code) || `Hub #${staff.godownId}`}] ${staff.godownName || (godowns.find((g) => g.id === staff.godownId)?.erpName) || ''}`
                        : 'General (All Hubs)'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Salary</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {!isViewer ? formatCurrency(staff.monthlySalary) : '••••••'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setSalaryData({
                          amount: String(staff.monthlySalary || ''),
                          paymentMonth: new Date().toISOString().slice(0, 7),
                          paymentDate: new Date().toISOString().slice(0, 10),
                          paymentMethod: 'BANK_TRANSFER',
                        });
                        setIsSalaryModalOpen(true);
                      }}
                      icon={<CreditCard className="w-3.5 h-3.5" />}
                    >
                      Pay
                    </Button>
                  )}
                  {!isViewer && (
                    <button
                      onClick={() => openEditModal(staff)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-apple-accent hover:bg-apple-accent/10 transition-colors"
                      title="Edit Staff Member"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!isViewer && (
                    <button
                      onClick={() => setStaffToDelete(staff)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                      title="Remove Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        title={editingStaff ? `Edit Personnel Member: ${editingStaff.fullName}` : 'Add Personnel Member'}
        description={
          editingStaff
            ? `Update role designation, monthly salary, and contact details for ${editingStaff.fullName}.`
            : 'Register a security guard, technician, or warehouse manager.'
        }
      >
        <form onSubmit={handleSubmitStaff} className="space-y-4">
          <FormField label="Full Name" required>
            <Input
              placeholder="e.g. Ramesh Kumar"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Role / Designation" required>
              <Input
                placeholder="e.g. Security Guard, Supervisor, Technician..."
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Monthly Salary (₹)" required>
              <Input
                type="number"
                placeholder="e.g. 18000"
                value={formData.monthlySalary}
                onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Phone Number" required>
              <Input
                placeholder="e.g. +91 98765 12345"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Email">
              <Input
                type="email"
                placeholder="Optional email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Assigned Hub">
            <Select
              value={formData.godownId}
              onChange={(e) => setFormData({ ...formData, godownId: e.target.value })}
            >
              <option value="">General (All Hubs)</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  [{g.code || `Hub #${g.id}`}] {g.erpName || g.name}{g.city ? ` - ${g.city}` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => {
              setIsModalOpen(false);
              setEditingStaff(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingStaff ? 'Save Changes' : 'Add Personnel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Disburse Salary Modal */}
      <Modal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        title="Disburse Monthly Salary"
        description={`Logging payout for ${selectedStaff?.fullName}`}
      >
        <form onSubmit={handleDisburseSalary} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Salary Month" required>
              <Input
                type="month"
                value={salaryData.paymentMonth}
                onChange={(e) => setSalaryData({ ...salaryData, paymentMonth: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Disbursement Date" required>
              <Input
                type="date"
                value={salaryData.paymentDate}
                onChange={(e) => setSalaryData({ ...salaryData, paymentDate: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label="Amount (₹)" required>
            <Input
              type="number"
              value={salaryData.amount}
              onChange={(e) => setSalaryData({ ...salaryData, amount: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Payment Method">
            <Select
              value={salaryData.paymentMethod}
              onChange={(e) => setSalaryData({ ...salaryData, paymentMethod: e.target.value })}
            >
              <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
            </Select>
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsSalaryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Confirm Disbursement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Confirmation Modal */}
      <Modal
        isOpen={Boolean(staffToDelete)}
        onClose={() => !isDeleting && setStaffToDelete(null)}
        title="Remove Staff Member"
        description="Confirm removal of personnel record from directory"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-apple-danger/5 border border-apple-danger/20 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-apple-danger/10 text-apple-danger shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Are you sure you want to remove this staff record?
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                You are about to remove <strong>{staffToDelete?.fullName}</strong> ({staffToDelete?.role})
                {staffToDelete?.godownName ? ` from ${staffToDelete.godownName}` : ''}. This record will be permanently deleted from the directory.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStaffToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDeleteStaff}
              loading={isDeleting}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Delete Staff Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

