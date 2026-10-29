import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  Maximize2,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Users,
  Wrench,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle,
  FileText,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { apiClient } from '../lib/api';
import { DashboardStats, ReminderItem, CashflowTrendItem, ActivityLog, ApiResponse } from '../types';
import { formatINR, formatINRCompact, formatSqft, formatDate } from '../lib/utils';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // 1. Dashboard stats query
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      return res.data.data;
    },
  });

  // 2. Reminders query
  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['dashboardReminders'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReminderItem[]>>('/dashboard/reminders');
      return res.data.data;
    },
  });

  // 3. Cashflow trend query
  const { data: trendData } = useQuery({
    queryKey: ['dashboardTrend'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CashflowTrendItem[]>>('/dashboard/cashflow-trend?months=6');
      return res.data.data;
    },
  });

  // 4. Recent activities query
  const { data: activitiesData } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ActivityLog[]>>('/activity-logs/recent');
      return res.data.data;
    },
  });

  const stats = statsData;
  const reminders = remindersData || [];
  const urgentReminders = reminders.filter((r) => r.urgency === 'HIGH');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Portfolio Overview
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Real-time telemetry across your Andhra Pradesh & Telangana warehouse facilities.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/godowns')}
            icon={<Plus className="w-4 h-4" />}
          >
            New Godown
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/rent-ledger')}
            icon={<Receipt className="w-4 h-4" />}
          >
            Record Rent
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/expenses')}
            icon={<CreditCard className="w-4 h-4" />}
          >
            Add Bill
          </Button>
        </div>
      </div>

      {/* Hero Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Godowns"
          value={statsLoading ? '...' : `${stats?.activeGodowns || 0} / ${stats?.totalGodowns || 0}`}
          subtitle={`${stats?.occupancyRate || 0}% Occupancy Rate`}
          icon={<Warehouse className="w-5 h-5" />}
          onClick={() => navigate('/godowns')}
        />
        <StatCard
          title="Total Floor Area"
          value={statsLoading ? '...' : formatSqft(stats?.totalAreaSqft)}
          subtitle="Industrial Leasable Space"
          icon={<Maximize2 className="w-5 h-5" />}
          onClick={() => navigate('/godowns')}
        />
        <StatCard
          title="Monthly Rent Roll"
          value={statsLoading ? '...' : formatINRCompact(stats?.monthlyRentRoll)}
          subtitle={`Collected: ${formatINRCompact(stats?.currentMonthCollectedRent)}`}
          trend={
            (stats?.currentMonthOverdueRent || 0) > 0
              ? { value: `Overdue: ${formatINRCompact(stats?.currentMonthOverdueRent)}`, isPositive: false }
              : undefined
          }
          icon={<Receipt className="w-5 h-5" />}
          onClick={() => navigate('/rent-ledger')}
        />
        <StatCard
          title="Net Operating Cashflow"
          value={statsLoading ? '...' : formatINRCompact(stats?.netOperatingIncome)}
          subtitle={`Expenses: ${formatINRCompact(stats?.currentMonthExpenses)}`}
          trend={{ value: 'Net Profit', isPositive: (stats?.netOperatingIncome || 0) >= 0 }}
          icon={<TrendingUp className="w-5 h-5" />}
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Main Grid: Cashflow Trend & Urgent Alert Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Bar Chart (2 columns on large screens) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-apple-text dark:text-apple-darkText">
                Monthly Income & Expenses Trend
              </h2>
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                Past 6 months cashflow breakdown (Rent Income vs Operating Bills & Salaries)
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              Details <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#86868B' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#86868B' }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatINR(value), '']}
                  contentStyle={{
                    backgroundColor: 'rgba(28, 28, 30, 0.9)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="rentIncome"
                  name="Rent Income"
                  fill="#0071E3"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="operatingExpenses"
                  name="Operating Bills"
                  fill="#FF9F0A"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="staffSalaries"
                  name="Staff Salaries"
                  fill="#34C759"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Action Center: Reminders & Critical Alerts */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-apple-text dark:text-apple-darkText">
                  Urgent Attention
                </h2>
                <span className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary">
                  {urgentReminders.length} critical items require action
                </span>
              </div>
            </div>
            {reminders.length > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {reminders.length} Total
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-1">
            {remindersLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-apple-text dark:text-apple-darkText">
                  All caught up!
                </p>
                <p className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                  No overdue bills, expired leases, or critical alerts.
                </p>
              </div>
            ) : (
              reminders.slice(0, 5).map((rem) => (
                <div
                  key={rem.id}
                  className="p-3 rounded-xl bg-apple-bg dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.05] hover:border-apple-accent/30 transition-all text-xs flex flex-col gap-1 cursor-pointer"
                  onClick={() => {
                    if (rem.type.includes('RENT')) navigate('/rent-ledger');
                    else if (rem.type.includes('BILL')) navigate('/expenses');
                    else if (rem.type.includes('LEASE')) navigate('/godowns');
                    else if (rem.type.includes('WARRANTY')) navigate('/assets');
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-apple-text dark:text-apple-darkText truncate">
                      {rem.title}
                    </span>
                    <Badge
                      variant={rem.urgency === 'HIGH' ? 'danger' : 'warning'}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {rem.urgency}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary line-clamp-1">
                    {rem.description}
                  </p>
                  {rem.dueDate && (
                    <div className="flex items-center gap-1 text-[10px] text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                      <Clock className="w-3 h-3 opacity-60" />
                      <span>Due: {formatDate(rem.dueDate)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Secondary Row: Quick Nav Widgets & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Nav Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="p-5 cursor-pointer hover:shadow-apple-card transition-all flex flex-col justify-between"
            onClick={() => navigate('/staff')}
          >
            <div className="p-2.5 rounded-full bg-apple-bg dark:bg-white/[0.06] text-apple-accent w-fit mb-3">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-apple-text dark:text-apple-darkText">
                {stats?.activeStaffCount || 0}
              </p>
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                Stationed Staff Members
              </p>
            </div>
          </Card>

          <Card
            className="p-5 cursor-pointer hover:shadow-apple-card transition-all flex flex-col justify-between"
            onClick={() => navigate('/assets')}
          >
            <div className="p-2.5 rounded-full bg-apple-bg dark:bg-white/[0.06] text-apple-accent w-fit mb-3">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-apple-text dark:text-apple-darkText">
                {stats?.totalAssetsCount || 0}
              </p>
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                Registered Assets & Units
              </p>
            </div>
          </Card>

          <Card
            className="p-5 cursor-pointer hover:shadow-apple-card transition-all flex flex-col justify-between"
            onClick={() => navigate('/documents')}
          >
            <div className="p-2.5 rounded-full bg-apple-bg dark:bg-white/[0.06] text-apple-accent w-fit mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-apple-text dark:text-apple-darkText">
                Document Vault
              </p>
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                Leases, Invoices & Photos
              </p>
            </div>
          </Card>

          <Card
            className="p-5 cursor-pointer hover:shadow-apple-card transition-all flex flex-col justify-between"
            onClick={() => navigate('/expenses')}
          >
            <div className="p-2.5 rounded-full bg-apple-bg dark:bg-white/[0.06] text-apple-accent w-fit mb-3">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-apple-text dark:text-apple-darkText">
                {formatINRCompact(stats?.receivableBillsFromTenants)}
              </p>
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                Receivable from Tenants
              </p>
            </div>
          </Card>
        </div>

        {/* Real-time Activity Log Audit Trail */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-apple-text dark:text-apple-darkText">
                Activity Audit Trail
              </h2>
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                Recent changes, payments, and godown modifications
              </p>
            </div>
            <Clock className="w-4 h-4 text-apple-secondary opacity-60" />
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {(activitiesData || []).length === 0 ? (
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary text-center py-6">
                No recent activity recorded yet.
              </p>
            ) : (
              (activitiesData || []).slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 text-xs p-2.5 rounded-xl bg-apple-bg/50 dark:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="neutral" className="text-[9px] uppercase px-1.5">
                      {act.entityType}
                    </Badge>
                    <span className="text-apple-text dark:text-apple-darkText truncate">
                      {act.description}
                    </span>
                  </div>
                  <span className="text-[10px] text-apple-secondary dark:text-apple-darkSecondary whitespace-nowrap">
                    {formatDate(act.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

