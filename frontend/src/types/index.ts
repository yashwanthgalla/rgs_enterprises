export interface User {
  id: number;
  username?: string;
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
  user?: User;
}

export interface BroadbandConnection {
  id?: number;
  hubId?: number;
  networkProvider?: string;
  provider?: string;
  accountNumber?: string;
  registeredMobileNumber?: string;
  registeredMobile?: string;
  userId?: string;
  userIdCode?: string;
  currentPlanEndDate?: string;
  serviceContactNumber?: string;
  speedMbps?: number;
}

export interface Hub {
  id: number;
  name: string;
  erpName?: string;
  code?: string;
  codeNumber?: number;
  location?: string;
  locationAddress?: string;
  city?: string;
  state?: string;
  stateId?: number;
  address?: string;
  pincode?: string;
  postalCode?: string;
  capacitySqFt?: number;
  totalCapacity?: number;
  capacityUnit?: string;
  sizeSqft?: number;
  occupiedSqFt?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'YET_TO_LIVE' | 'CLOSED' | 'TERMINATED' | string;
  hubStatus?: string;
  model?: 'OSH' | 'COMPANY_OWNED' | 'LEASED' | string;
  hubModel?: 'LDP' | 'OSH' | 'ISH' | string;
  occupancyStatus?: 'OCCUPIED' | 'VACANT' | 'UNDER_NOTICE' | string;
  monthlyRent?: number;
  securityAdvance?: number;
  refundableAdvance?: number;
  currentTenant?: string;
  tenant?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseDurationMonths?: number;
  hubPocName?: string;
  hubPocContact?: string;
  googleLocation?: string;
  mapsUrl?: string;
  operationsPocName?: string;
  operationsPocMobile?: string;
  opsPocName?: string;
  opsPocMobile?: string;
  broadbandDetails?: BroadbandConnection[];
  cctvUsername?: string;
  cctvPassword?: string;
  cctvAccessUrl?: string;
  hasLabourLicence?: boolean;
  labourLicenceStartDate?: string;
  labourLicenceExpiryDate?: string;
  hasTradeLicence?: boolean;
  tradeLicenceStartDate?: string;
  tradeLicenceExpiryDate?: string;
  totalSetupCost?: number;
  electricityProvider?: string;
  electricityServiceNumber?: string;
  leaseContactName?: string;
  leaseContactMobile?: string;
  ownerName?: string;
  ownerAddress?: string;
  ownerMobile?: string;
  notes?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type Godown = Hub;

export interface FinanceRentAgreement {
  id: number;
  hubId: number;
  agreementNumber?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  refundableAdvance: number;
  totalSetupCost: number;
  tdsApplied: boolean;
  tdsPercent: number;
  gstApplied: boolean;
  gstPercent: number;
  escalationPercent: number;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
}

export interface FinanceRentInvoice {
  id: number;
  hubId: number;
  hubCode: string;
  hubName: string;
  agreementId: number;
  periodMonth: string;
  baseRent: number;
  tdsApplied: boolean;
  tdsPercent: number;
  tdsAmount: number;
  gstApplied: boolean;
  gstPercent: number;
  gstAmount: number;
  netPayable: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  dueDate: string;
  createdAt?: string;
}

export interface FinanceTotalRevenue {
  id: number;
  hubId: number;
  hubName?: string;
  hubCode?: string;
  financialYear: string;
  rent: number;
  setupCostPerMonth: number;
  electricity: number;
  wifi: number;
  manpower: number;
  housekeeping: number;
  wmRefreshmentPettyCash: number;
  others?: number;
  totalRevenue: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceRent {
  id: number;
  hubId: number;
  hubName?: string;
  hubCode?: string;
  period: string;
  rent: number;
  tdsPercent: number;
  tdsAmount: number;
  totalRentAfterTds: number;
  gstPercent: number;
  gstAmount: number;
  totalRentIncludingGst: number;
  electricityBill: number;
  wifiBill: number;
  sorterPayments: number;
  pettyCash: number;
  others?: number;
  total: number;
  tdsApplied?: boolean;
  gstApplied?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentEntry {
  id: number;
  hubId?: number;
  godownId?: number;
  hubName?: string;
  godownName?: string;
  hubCode?: string;
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
  hubId?: number;
  godownId?: number;
  hubName?: string;
  godownName?: string;
  hubCode?: string;
  godownCode?: string;
  category: 'ELECTRICITY' | 'WATER' | 'PROPERTY_TAX' | 'MAINTENANCE' | 'SALARY' | 'SECURITY' | 'INSURANCE' | 'WIFI' | 'INTERNET' | 'BROADBAND' | 'OTHER' | string;
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
  hubId?: number;
  godownId?: number;
  hubName?: string;
  godownName?: string;
  hubCode?: string;
  godownCode?: string;
  employeeCode?: string;
  fullName: string;
  role: string;
  roleTitle?: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  monthlySalary: number | null;
  joiningDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
}

export interface Asset {
  id: number;
  hubId?: number;
  godownId?: number;
  hubName?: string;
  godownName?: string;
  hubCode?: string;
  godownCode?: string;
  name: string;
  serialNumber?: string;
  category: 'CCTV' | 'FIRE_SAFETY' | 'GENERATOR' | 'FORKLIFT' | 'LIGHTING' | 'HVAC' | 'IT_HARDWARE' | 'MATERIAL_HANDLING' | 'FURNITURE' | 'ELECTRICAL' | 'SECURITY' | 'OTHER' | string;
  purchaseDate?: string;
  purchaseCost?: number;
  cost?: number;
  quantity?: number;
  warrantyExpiry?: string;
  warrantyExpiryDate?: string;
  status?: 'OPERATIONAL' | 'NEEDS_REPAIR' | 'DECOMMISSIONED' | string;
  condition?: string;
  notes?: string;
}

export interface DocumentItem {
  id: number;
  hubId?: number;
  godownId?: number;
  hubName?: string;
  godownName?: string;
  hubCode?: string;
  godownCode?: string;
  title: string;
  documentType: 'LEASE_AGREEMENT' | 'TAX_RECEIPT' | 'UTILITY_BILL' | 'INSURANCE' | 'IDENTITY' | 'LABOUR_LICENCE' | 'TRADE_LICENCE' | 'OTHER';
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
  totalHubs: number;
  totalGodowns?: number;
  totalCapacitySqFt: number;
  occupiedCapacitySqFt: number;
  occupancyRate: number;
  monthlyRentExpected: number;
  monthlyRentCollected: number;
  monthlyTotalRevenue?: number;
  monthlyRentTotal?: number;
  monthlyProfit?: number;
  pendingRent: number;
  totalExpensesThisMonth: number;
  netRevenueThisMonth: number;
}

export interface ReportMonthlyBreakdown {
  month: string;
  monthName: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  totalProfit: number;
}

export interface ReportSummary {
  year: number;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalRent: number;
  totalProfit: number;
  totalMargin: number;
  marginPercent: number;
  monthlyBreakdown: ReportMonthlyBreakdown[];
  totalRentalIncome?: number;
  totalExpenses?: number;
  totalRentOutflow?: number;
  netProfit?: number;
}

export interface GodownPnlItem {
  godownId: number;
  godownName: string;
  godownCode?: string;
  hubId?: number;
  hubName?: string;
  hubCode?: string;
  city?: string;
  tenantName?: string;
  status?: string;
  totalRevenue: number;
  totalRent: number;
  totalProfit: number;
  margin: number;
  profitMargin: number;
  revenue?: number;
  rentalIncome?: number;
  expenses?: number;
  operatingExpenses?: number;
  netProfit?: number;
}

export type HubPnlItem = GodownPnlItem;
