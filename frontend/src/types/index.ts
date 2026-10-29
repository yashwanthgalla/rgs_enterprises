// TypeScript Interfaces matching Backend API Models & DTOs

export type Role = 'ADMIN' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email?: string;
  fullName: string;
  role: Role;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  mustChangePassword?: boolean;
  user: User;
}

export type GodownStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'VACANT';

export interface Godown {
  id: number;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  sizeSqft: number;
  status: GodownStatus;
  currentTenant?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  monthlyRent: number;
  securityAdvance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
}

export interface GodownSummary {
  godown: Godown;
  totalAssets: number;
  totalAssetValue: number;
  totalStaff: number;
  monthlyStaffCost: number;
  pendingBillsCount: number;
  pendingBillsAmount: number;
  overdueRentCount: number;
  overdueRentAmount: number;
}

export type RentStatus = 'DUE' | 'PAID' | 'PARTIAL' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'NEFT_RTGS';

export interface RentEntry {
  id: number;
  godownId: number;
  godownName: string;
  godownCode: string;
  currentTenant?: string;
  rentMonth: string;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  paymentDate?: string;
  status: RentStatus;
  paymentMethod?: PaymentMethod;
  transactionRef?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
}

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface Asset {
  id: number;
  godownId: number;
  godownName: string;
  godownCode: string;
  name: string;
  category: string;
  serialNumber?: string;
  quantity: number;
  cost: number;
  condition: AssetCondition;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
}

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: number;
  godownId?: number;
  godownName: string;
  fullGodownInfo: string;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  monthlySalary: number;
  joiningDate: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
}

export type SalaryStatus = 'PAID' | 'PENDING';

export interface SalaryPayment {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeRole: string;
  godownName: string;
  paymentMonth: string;
  amount: number;
  paymentDate?: string;
  status: SalaryStatus;
  paymentMode?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
}

export type ExpenseCategory =
  | 'ELECTRICITY'
  | 'INTERNET'
  | 'WATER'
  | 'PROPERTY_TAX'
  | 'MAINTENANCE'
  | 'SECURITY'
  | 'INSURANCE'
  | 'REPAIRS'
  | 'OTHER';

export type ExpenseResponsibility = 'COMPANY' | 'TENANT';
export type ExpenseStatus = 'PAID' | 'PENDING' | 'RECEIVABLE';

export interface Expense {
  id: number;
  godownId: number;
  godownName: string;
  godownCode: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  responsibility: ExpenseResponsibility;
  status: ExpenseStatus;
  billDate: string;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionRef?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
}

export type DocumentType =
  | 'LEASE_AGREEMENT'
  | 'BILL_INVOICE'
  | 'PROPERTY_TAX'
  | 'INSPECTION_REPORT'
  | 'OTHER';

export interface DocumentItem {
  id: number;
  godownId?: number;
  godownName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  publicUrl: string;
  documentType: DocumentType;
  description?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalGodowns: number;
  activeGodowns: number;
  totalAreaSqft: number;
  occupancyRate: number;
  monthlyRentRoll: number;
  currentMonthCollectedRent: number;
  currentMonthOverdueRent: number;
  currentMonthExpenses: number;
  receivableBillsFromTenants: number;
  netOperatingIncome: number;
  activeStaffCount: number;
  totalAssetsCount: number;
  urgentRemindersCount: number;
}

export interface ReminderItem {
  id: string;
  type: 'OVERDUE_RENT' | 'UPCOMING_RENT' | 'OVERDUE_BILL' | 'UPCOMING_BILL' | 'LEASE_EXPIRING' | 'LEASE_EXPIRED' | 'WARRANTY_EXPIRING' | 'WARRANTY_EXPIRED';
  title: string;
  description: string;
  amount?: number;
  dueDate?: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  entityId: number;
  godownName: string;
}

export interface CashflowTrendItem {
  month: string;
  rentIncome: number;
  operatingExpenses: number;
  staffSalaries: number;
  netCashflow: number;
}

export interface ReportSummary {
  periodStart: string;
  periodEnd: string;
  totalRentBilled: number;
  totalRentCollected: number;
  totalRentOutstanding: number;
  totalCompanyExpenses: number;
  totalTenantExpenses: number;
  totalSalariesPaid: number;
  netOperatingProfit: number;
  expensesByCategory: Record<string, number>;
}

export interface GodownPnl {
  godownId: number;
  godownName: string;
  godownCode: string;
  city: string;
  tenantName: string;
  rentIncome: number;
  operatingExpenses: number;
  staffExpense: number;
  netProfit: number;
  occupancyStatus: string;
}

export interface ActivityLog {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface AppSettings {
  id: number;
  companyName: string;
  logoUrl?: string;
  currencySymbol: string;
  contactEmail?: string;
  contactPhone?: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

