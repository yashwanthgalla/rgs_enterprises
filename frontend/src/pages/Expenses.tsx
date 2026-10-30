import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { expenseApi, godownApi } from '../services/api';
import { Expense, Godown } from '../types';

export const Expenses: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('ALL');

  // Add Bill Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    godownId: '',
    category: 'ELECTRICITY',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    billResponsibility: 'COMPANY',
    status: 'PENDING',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const [eRes, gRes] = await Promise.all([
        expenseApi.getAll({ size: 100 }),
        godownApi.getAllList().catch(() => godownApi.getAll(0, 100)),
      ]);

      const expList = Array.isArray(eRes) ? eRes : (eRes as any)?.content || [];
      const gList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setExpenses(expList);
      setGodowns(gList);
    } catch (err: any) {
      error('Failed to load expenses: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      error('Please fill required fields');
      return;
    }

    setSubmitting(true);
    try {
      await expenseApi.create({
        title: formData.title,
        godownId: formData.godownId ? Number(formData.godownId) : null,
        category: formData.category,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        dueDate: formData.dueDate || null,
        billResponsibility: formData.billResponsibility,
        status: formData.status,
      });

      success('Bill recorded successfully');
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      error('Failed to save bill: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayExpense = async (id: number) => {
    try {
      await expenseApi.recordPayment(id, { paidBy: 'Admin' });
      success('Bill marked as paid');
      fetchExpenses();
    } catch (err: any) {
      error('Failed to mark as paid: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await expenseApi.delete(id);
      success('Expense deleted');
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      error('Failed to delete: ' + err.message);
    }
  };

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const companyExpense = expenses.filter((e) => e.billResponsibility === 'COMPANY').reduce((acc, e) => acc + (e.amount || 0), 0);
  const tenantExpense = expenses.filter((e) => e.billResponsibility === 'TENANT').reduce((acc, e) => acc + (e.amount || 0), 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.godownName && e.godownName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchesPayer = payerFilter === 'ALL' || e.billResponsibility === payerFilter;
    return matchesSearch && matchesCategory && matchesPayer;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Operating Expenses & Utilities
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Electricity, municipal taxes, maintenance, security, and tenant utility reimbursements
          </p>
        </div>

        <Button
          onClick={() => {
            setFormData({
              title: '',
              godownId: '',
              category: 'ELECTRICITY',
              amount: '',
              expenseDate: new Date().toISOString().slice(0, 10),
              dueDate: '',
              billResponsibility: 'COMPANY',
              status: 'PENDING',
            });
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl shadow-apple-sm"
        >
          Add New Bill
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Outflow</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-accent/10 text-apple-accent">
            <Receipt className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company Borne</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(companyExpense)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-purple/10 text-[#5856D6]">
            <Building className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tenant Reimbursable</span>
            <p className="text-xl font-bold text-apple-success mt-0.5">{formatCurrency(tenantExpense)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-success/10 text-apple-success">
            <User className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by bill title or godown..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="ALL">All Categories</option>
          <option value="ELECTRICITY">Electricity</option>
          <option value="WATER">Water</option>
          <option value="PROPERTY_TAX">Property Tax</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="SALARY">Salary</option>
          <option value="SECURITY">Security</option>
          <option value="INSURANCE">Insurance</option>
          <option value="OTHER">Other</option>
        </Select>

        <Select
          value={payerFilter}
          onChange={(e) => setPayerFilter(e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="ALL">All Payers</option>
          <option value="COMPANY">Company Borne</option>
          <option value="TENANT">Tenant Reimbursable</option>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card className="p-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Title / Godown</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Billed To</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{exp.title}</p>
                      <p className="text-[11px] text-gray-400">{exp.godownName || (exp.godownId ? `Godown #${exp.godownId}` : 'General Portfolio')}</p>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-gray-700 dark:text-gray-300">
                      {exp.category}
                    </td>
                    <td className="py-3.5 px-3 text-gray-500">
                      {exp.expenseDate}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={exp.billResponsibility === 'TENANT' ? 'accent' : 'neutral'} size="sm">
                        {exp.billResponsibility}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={exp.status === 'PAID' ? 'success' : exp.status === 'OVERDUE' ? 'danger' : 'warning'} size="sm">
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      {exp.status !== 'PAID' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePayExpense(exp.id)}
                          icon={<CheckCircle className="w-3.5 h-3.5" />}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                        title="Delete bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Bill Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Operating Expense"
        description="Record a new utility, maintenance, or tax expense."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <FormField label="Bill Title / Description" required>
            <Input
              placeholder="e.g. TSSPDCL Substation Power - Nov 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Facility">
            <Select
              value={formData.godownId}
              onChange={(e) => setFormData({ ...formData, godownId: e.target.value })}
            >
              <option value="">General (All Facilities)</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} - {g.location}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="ELECTRICITY">Electricity</option>
                <option value="WATER">Water</option>
                <option value="PROPERTY_TAX">Property Tax</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SECURITY">Security</option>
                <option value="SALARY">Salary</option>
                <option value="INSURANCE">Insurance</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>

            <FormField label="Amount (₹)" required>
              <Input
                type="number"
                placeholder="e.g. 12500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Expense Date" required>
              <Input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Due Date">
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Responsibility">
              <Select
                value={formData.billResponsibility}
                onChange={(e) => setFormData({ ...formData, billResponsibility: e.target.value as any })}
              >
                <option value="COMPANY">Company Borne</option>
                <option value="TENANT">Tenant Reimbursable</option>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
