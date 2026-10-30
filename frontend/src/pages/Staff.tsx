import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, godownApi, salaryApi } from '../services/api';
import { Staff, Godown } from '../types';

export const StaffDirectory: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'Security Guard',
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

  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const [sRes, gRes] = await Promise.all([
        employeeApi.getAll({ size: 100 }),
        godownApi.getAllList().catch(() => godownApi.getAll(0, 100)),
      ]);

      const employees = Array.isArray(sRes) ? sRes : (sRes as any)?.content || [];
      const gList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setStaffList(employees);
      setGodowns(gList);
    } catch (err: any) {
      error('Failed to load personnel: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phoneNumber || !formData.monthlySalary) {
      error('Please fill required fields');
      return;
    }

    setSubmitting(true);
    try {
      await employeeApi.create({
        fullName: formData.fullName,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        email: formData.email || null,
        monthlySalary: Number(formData.monthlySalary),
        godownId: formData.godownId ? Number(formData.godownId) : null,
        joiningDate: formData.joiningDate,
        status: formData.status,
      });

      success('Staff member registered');
      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      error('Failed to register staff: ' + (err.message || 'Error'));
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
    } catch (err: any) {
      error('Failed to record salary: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('Delete this staff record?')) return;
    try {
      await employeeApi.delete(id);
      success('Staff record removed');
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      error('Failed to delete staff: ' + err.message);
    }
  };

  const totalPayroll = staffList.reduce((acc, s) => acc + (s.monthlySalary || 0), 0);

  const filteredStaff = staffList.filter((s) => {
    return (
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phoneNumber.includes(searchQuery)
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

        <Button
          onClick={() => {
            setFormData({
              fullName: '',
              role: 'Security Guard',
              phoneNumber: '',
              email: '',
              monthlySalary: '',
              godownId: '',
              joiningDate: new Date().toISOString().slice(0, 10),
              status: 'ACTIVE',
            });
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl shadow-apple-sm"
        >
          Add Staff Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Active Staff</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{staffList.length} Personnel</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-accent/10 text-apple-accent">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Monthly Payroll Obligation</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(totalPayroll)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-success/10 text-apple-success">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
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
                    <span>{staff.godownName || (staff.godownId ? `Godown #${staff.godownId}` : 'All Godowns')}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Salary</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(staff.monthlySalary)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
                  <button
                    onClick={() => handleDeleteStaff(staff.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Personnel Member"
        description="Register a security guard, technician, or warehouse manager."
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <FormField label="Full Name" required>
            <Input
              placeholder="e.g. Ramesh Kumar"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Role / Designation" required>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Security Guard">Security Guard</option>
                <option value="Head Guard">Head Guard</option>
                <option value="Warehouse Supervisor">Warehouse Supervisor</option>
                <option value="Electrician">Electrician</option>
                <option value="Maintenance Crew">Maintenance Crew</option>
              </Select>
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

          <div className="grid grid-cols-2 gap-3">
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

          <FormField label="Assigned Godown">
            <Select
              value={formData.godownId}
              onChange={(e) => setFormData({ ...formData, godownId: e.target.value })}
            >
              <option value="">General (All Warehouses)</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} - {g.location}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Personnel
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
          <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
};
