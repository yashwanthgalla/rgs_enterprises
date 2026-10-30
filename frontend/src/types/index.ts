export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType?: string;
  expiresIn?: number;
  mustChangePassword?: boolean;
  username?: string;
  email?: string;
  role?: string;
  fullName?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    mustChangePassword?: boolean;
  };
}

export interface Godown {
  id: number;
  name: string;
  code?: string;
  location: string;
  city?: string;
  state?: string;
  address?: string;
  pincode?: string;
  capacitySqFt: number;
  sizeSqft?: number;
  occupiedSqFt?: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  monthlyRent: number;
  securityAdvance?: number;
  currentTenant?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentEntry {
  id: number;
  godownId: number;
  godownName?: string;
  godownCode?: string;
  tenantName: string;
  currentTenant?: string;
  month: string;
  rentMonth?: string;
  year?: number;
  amountDue: number;
  dueAmount?: number;
  amountPaid: number;
  paidAmount?: number;
  status: 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE';
  dueDate: string;
  paidDate?: string;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  transactionRef?: string;
  notes?: string;
}

export interface Expense {
  id: number;
  godownId?: number;
  godownName?: string;
  godownCode?: string;
  category: 'ELECTRICITY' | 'WATER' | 'PROPERTY_TAX' | 'MAINTENANCE' | 'SALARY' | 'SECURITY' | 'INSURANCE' | 'OTHER';
  title: string;
  amount: number;
  expenseDate: string;
  billDate?: string;
  dueDate?: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  billResponsibility: 'COMPANY' | 'TENANT';
  responsibility?: 'COMPANY' | 'TENANT';
  paidBy?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface Staff {
  id: number;
  godownId?: number;
  godownName?: string;
  fullName: string;
  role: string;
  phoneNumber: string;
  phone?: string;
  email?: string;
  monthlySalary: number;
  joiningDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

export interface Asset {
  id: number;
  godownId: number;
  godownName?: string;
  godownCode?: string;
  name: string;
  serialNumber?: string;
  category: 'CCTV' | 'FIRE_SAFETY' | 'GENERATOR' | 'FORKLIFT' | 'LIGHTING' | 'HVAC' | 'OTHER';
  purchaseDate?: string;
  purchaseCost?: number;
  cost?: number;
  warrantyExpiry?: string;
  warrantyExpiryDate?: string;
  status: 'OPERATIONAL' | 'NEEDS_REPAIR' | 'DECOMMISSIONED' | string;
  condition?: string;
  notes?: string;
}

export interface DocumentItem {
  id: number;
  godownId?: number;
  godownName?: string;
  title: string;
  documentType: 'LEASE_AGREEMENT' | 'TAX_RECEIPT' | 'UTILITY_BILL' | 'INSURANCE' | 'IDENTITY' | 'OTHER';
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface AppSettings {
  companyName: string;
  companyTagline?: string;
  contactEmail?: string;
  alertEmail?: string;
  contactPhone?: string;
  address?: string;
  companyAddress?: string;
  currency: string;
  defaultCurrency?: string;
  logoUrl?: string;
}

export interface DashboardMetrics {
  totalGodowns: number;
  totalCapacitySqFt: number;
  occupiedCapacitySqFt: number;
  occupancyRate: number;
  monthlyRentExpected: number;
  monthlyRentCollected: number;
  pendingRent: number;
  totalExpensesThisMonth: number;
  netRevenueThisMonth: number;
}
