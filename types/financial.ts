// Financial Management Types and Interfaces
// Comprehensive type definitions for Financial & A&P Management system

// =============================================
// Core Financial Types
// =============================================

export type PeriodType = 
  | 'annual'
  | 'quarterly' 
  | 'monthly'
  | 'weekly'
  | 'custom';

export type BudgetStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'locked'
  | 'cancelled'
  | 'expired'
  | 'under_review';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'requires_revision';

export type ExpenseStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'pending_payment'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'disputed'
  | 'rejected';

export type CategoryType = 
  | 'operational'
  | 'marketing'
  | 'sales'
  | 'administrative'
  | 'research_development'
  | 'manufacturing'
  | 'logistics'
  | 'personnel'
  | 'technology'
  | 'facilities'
  | 'other';

export type ExpenseType = 
  | 'logistics'
  | 'warehousing'
  | 'personnel'
  | 'technology'
  | 'facilities'
  | 'professional_services'
  | 'travel'
  | 'training'
  | 'utilities'
  | 'insurance'
  | 'equipment'
  | 'supplies'
  | 'maintenance'
  | 'other';

export type PaymentMethod = 
  | 'bank_transfer'
  | 'check'
  | 'credit_card'
  | 'wire_transfer'
  | 'ach'
  | 'cash'
  | 'other';

export type RecurrencePattern = 
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | 'weekly'
  | 'bi_weekly'
  | 'custom';

export type AllocationType = 
  | 'department'
  | 'region'
  | 'distributor'
  | 'campaign'
  | 'product_line'
  | 'sales_channel'
  | 'cost_center'
  | 'project'
  | 'employee';

export type AllocationBasis = 
  | 'equal'
  | 'revenue_based'
  | 'headcount_based'
  | 'area_based'
  | 'custom';

export type FinancialPeriodStatus = 
  | 'future'
  | 'open'
  | 'closed'
  | 'locked'
  | 'archived';

// =============================================
// Budget Category Interface
// =============================================

export interface BudgetCategory {
  id: string;
  
  // Category Information
  name: string;
  code: string;
  description?: string;
  
  // Hierarchy Support
  parentId?: string;
  categoryLevel: number;
  fullPath?: string;
  
  // Classification
  categoryType: CategoryType;
  
  // Configuration
  isActive: boolean;
  requiresApproval: boolean;
  approvalThreshold?: number;
  
  // Multi-tenant
  brandId?: string;
  isGlobal: boolean;
  
  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Financial Budget Interface
// =============================================

export interface FinancialBudget {
  id: string;
  
  // Budget Identification
  budgetName: string;
  budgetCode: string;
  
  // Organizational Hierarchy
  brandId: string;
  distributorId?: string;
  regionId?: string;
  countryCode?: string;
  
  // Categorization
  budgetCategoryId: string;
  department?: string;
  costCenter?: string;
  
  // Period Management
  fiscalYear: number;
  periodType: PeriodType;
  periodStartDate: string;
  periodEndDate: string;
  periodNumber?: number;
  
  // Budget Amounts
  plannedAmount: number;
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  remainingAmount: number;
  
  // Variance Tracking
  varianceAmount: number;
  variancePercentage: number;
  
  // Currency
  currency: string;
  exchangeRate: number;
  baseCurrencyAmount: number;
  
  // Status
  status: BudgetStatus;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  
  // Revision
  versionNumber: number;
  previousVersionId?: string;
  revisionReason?: string;
  
  // Alerts
  alertThresholdPercentage: number;
  criticalThresholdPercentage: number;
  
  // Configuration
  isRolloverBudget: boolean;
  rolloverFromBudgetId?: string;
  autoAllocate: boolean;
  
  // Notes
  notes?: string;
  budgetJustification?: string;
  tags?: string[];
  
  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Budget Allocation Interface
// =============================================

export interface BudgetAllocation {
  id: string;
  
  // Reference
  financialBudgetId: string;
  
  // Target
  allocationType: AllocationType;
  targetId?: string;
  targetName: string;
  
  // Amounts
  allocatedPercentage?: number;
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  remainingAmount: number;
  
  // Status
  status: 'active' | 'suspended' | 'exhausted' | 'cancelled';
  
  // Dates
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  
  // Notes
  allocationNotes?: string;
  
  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Operational Expense Interface
// =============================================

export interface OperationalExpense {
  id: string;
  
  // Basic Information
  expenseNumber: string;
  description: string;
  
  // Organizational Context
  brandId: string;
  distributorId?: string;
  regionId?: string;
  department?: string;
  costCenter?: string;
  
  // Budget Allocation
  budgetAllocationId?: string;
  budgetCategoryId: string;
  
  // Classification
  expenseType: ExpenseType;
  expenseSubcategory?: string;
  
  // Financial Details
  grossAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  currency: string;
  exchangeRate: number;
  baseCurrencyAmount: number;
  
  // Timing
  expenseDate: string;
  dueDate?: string;
  paidDate?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  
  // Vendor Information
  vendorId?: string;
  vendorName?: string;
  vendorContact?: string;
  invoiceNumber?: string;
  purchaseOrderNumber?: string;
  
  // Payment Information
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  bankReference?: string;
  
  // Status and Approval
  status: ExpenseStatus;
  approvalStatus: ApprovalStatus;
  
  // Workflow
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  
  // Recurring Configuration
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  nextOccurrenceDate?: string;
  
  // Allocation
  allocationPercentage: number;
  isAllocatable: boolean;
  allocationBasis?: AllocationBasis;
  
  // Documents
  receiptUrl?: string;
  invoiceUrl?: string;
  purchaseOrderUrl?: string;
  supportingDocuments?: string[];
  
  // Additional Classification
  isCapitalExpense: boolean;
  assetClass?: string;
  depreciationMethod?: string;
  usefulLifeYears?: number;
  
  // Tax and Compliance
  taxCategory?: string;
  isTaxDeductible: boolean;
  taxCode?: string;
  
  // Associations
  projectId?: string;
  campaignId?: string;
  
  // Notes
  internalNotes?: string;
  vendorNotes?: string;
  approvalComments?: string;
  tags?: string[];
  
  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Expense Approval Interface
// =============================================

export interface ExpenseApproval {
  id: string;
  
  // Reference
  expenseId: string;
  expenseType: 'operational' | 'marketing';
  
  // Approval Level
  approvalLevel: number;
  approverRole: string;
  approverUserId?: string;
  
  // Thresholds
  minAmount?: number;
  maxAmount?: number;
  
  // Decision
  approvalStatus: ApprovalStatus;
  approvedAmount?: number;
  approvalDate?: string;
  approvalComments?: string;
  rejectionReason?: string;
  
  // Delegation/Escalation
  delegatedTo?: string;
  escalatedTo?: string;
  escalationReason?: string;
  
  // Timing
  requestedAt: string;
  dueDate?: string;
  completedAt?: string;
  
  // Sequence
  isFinalApproval: boolean;
  nextApproverId?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Financial Period Interface
// =============================================

export interface FinancialPeriod {
  id: string;
  
  // Identification
  periodName: string;
  periodCode: string;
  
  // Classification
  periodType: PeriodType | 'fiscal_year' | 'calendar_year' | 'quarter' | 'month' | 'week';
  fiscalYear: number;
  calendarYear: number;
  
  // Dates
  startDate: string;
  endDate: string;
  
  // Hierarchy
  parentPeriodId?: string;
  periodSequence?: number;
  
  // Status
  status: FinancialPeriodStatus;
  closedDate?: string;
  closedBy?: string;
  
  // Organization
  brandId?: string;
  isGlobal: boolean;
  
  // Audit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Analytics and Summary Types
// =============================================

export interface BudgetSummary {
  totalBudgets: number;
  totalPlannedAmount: number;
  totalAllocatedAmount: number;
  totalSpentAmount: number;
  totalRemainingAmount: number;
  averageUtilization: number;
  overBudgetCount: number;
  alertCount: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  pendingApprovalAmount: number;
  approvedAmount: number;
  paidAmount: number;
  overdueAmount: number;
  averageExpenseAmount: number;
}

export interface BudgetVarianceAnalysis {
  budgetId: string;
  budgetName: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  isOverBudget: boolean;
  utilizationPercentage: number;
  remainingDays: number;
  projectedSpend: number;
  category: string;
}

export interface ExpenseBreakdown {
  expenseType: ExpenseType;
  count: number;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
}

export interface MonthlySpendTrend {
  month: string;
  year: number;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  expenseCount: number;
}

export interface DepartmentBudgetPerformance {
  department: string;
  totalBudget: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  expenseCount: number;
  averageExpenseAmount: number;
  overBudgetIndicator: boolean;
}

// =============================================
// Dashboard Metrics Types
// =============================================

export interface FinancialDashboardMetrics {
  budgetSummary: BudgetSummary;
  expenseSummary: ExpenseSummary;
  topExpenseCategories: ExpenseBreakdown[];
  budgetUtilizationByCategory: BudgetVarianceAnalysis[];
  monthlyTrends: MonthlySpendTrend[];
  departmentPerformance: DepartmentBudgetPerformance[];
  pendingApprovals: number;
  upcomingBudgetExpirations: FinancialBudget[];
  recentExpenses: OperationalExpense[];
  budgetAlerts: BudgetAlert[];
}

export interface CashFlowProjection {
  period: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  plannedInflows: number;
  actualInflows: number;
  plannedOutflows: number;
  actualOutflows: number;
  projectedClosingBalance: number;
  actualClosingBalance?: number;
  variance: number;
}

export interface ProfitLossStatement {
  period: string;
  periodStart: string;
  periodEnd: string;
  
  // Revenue
  totalRevenue: number;
  revenueByChannel: { channel: string; amount: number }[];
  
  // Cost of Goods Sold
  costOfGoodsSold: number;
  grossProfit: number;
  grossMarginPercentage: number;
  
  // Operating Expenses
  operatingExpenses: {
    marketing: number;
    sales: number;
    administrative: number;
    logistics: number;
    personnel: number;
    facilities: number;
    technology: number;
    other: number;
    total: number;
  };
  
  // Operating Income
  operatingIncome: number;
  operatingMarginPercentage: number;
  
  // Other Income/Expenses
  otherIncome: number;
  otherExpenses: number;
  
  // Net Income
  netIncome: number;
  netMarginPercentage: number;
  
  // Comparisons
  previousPeriodComparison?: {
    revenueGrowth: number;
    expenseGrowth: number;
    profitGrowth: number;
  };
}

// =============================================
// Alert and Notification Types
// =============================================

export type AlertType = 
  | 'budget_threshold'
  | 'budget_overrun'
  | 'approval_required'
  | 'expense_overdue'
  | 'period_closing'
  | 'variance_threshold';

export type AlertSeverity = 
  | 'info'
  | 'warning'
  | 'critical';

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budgetName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  thresholdValue: number;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface ExpenseAlert {
  id: string;
  expenseId: string;
  expenseNumber: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  amount: number;
  dueDate?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// =============================================
// Filter and Search Types
// =============================================

export interface FinancialFilters {
  brandId?: string;
  distributorId?: string;
  regionId?: string;
  department?: string;
  costCenter?: string;
  fiscalYear?: number;
  period?: string;
  categoryIds?: string[];
  expenseTypes?: ExpenseType[];
  status?: BudgetStatus[] | ExpenseStatus[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  tags?: string[];
  search?: string;
}

export interface FinancialSortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FinancialListResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// =============================================
// Request/Response Types
// =============================================

export interface CreateBudgetRequest {
  budgetName: string;
  brandId: string;
  distributorId?: string;
  regionId?: string;
  budgetCategoryId: string;
  fiscalYear: number;
  periodType: PeriodType;
  periodStartDate: string;
  periodEndDate: string;
  plannedAmount: number;
  allocatedAmount: number;
  currency?: string;
  department?: string;
  costCenter?: string;
  budgetJustification?: string;
  tags?: string[];
}

export interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  id: string;
  status?: BudgetStatus;
  approvalStatus?: ApprovalStatus;
  revisionReason?: string;
}

export interface CreateExpenseRequest {
  description: string;
  brandId: string;
  distributorId?: string;
  budgetCategoryId: string;
  expenseType: ExpenseType;
  grossAmount: number;
  currency?: string;
  expenseDate: string;
  vendorName?: string;
  invoiceNumber?: string;
  department?: string;
  notes?: string;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  id: string;
  status?: ExpenseStatus;
  approvalStatus?: ApprovalStatus;
  approvalComments?: string;
}

export interface CreateBudgetCategoryRequest {
  name: string;
  code: string;
  description?: string;
  categoryType: CategoryType;
  parentId?: string;
  brandId?: string;
  requiresApproval?: boolean;
  approvalThreshold?: number;
}

export interface CreateAllocationRequest {
  financialBudgetId: string;
  allocationType: AllocationType;
  targetName: string;
  allocatedAmount: number;
  allocatedPercentage?: number;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
}

// =============================================
// Component Props Types
// =============================================

export interface BudgetFormProps {
  budget?: FinancialBudget;
  onSubmit: (data: CreateBudgetRequest | UpdateBudgetRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  categories?: BudgetCategory[];
}

export interface ExpenseFormProps {
  expense?: OperationalExpense;
  onSubmit: (data: CreateExpenseRequest | UpdateExpenseRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  categories?: BudgetCategory[];
}

export interface FinancialDashboardProps {
  brandId?: string;
  distributorId?: string;
  fiscalYear?: number;
  period?: string;
  showComparison?: boolean;
}

export interface BudgetListProps {
  filters?: FinancialFilters;
  sortOptions?: FinancialSortOptions;
  onBudgetSelect?: (budget: FinancialBudget) => void;
  onBudgetEdit?: (budgetId: string) => void;
  allowSelection?: boolean;
  compact?: boolean;
}

export interface ExpenseListProps {
  filters?: FinancialFilters;
  sortOptions?: FinancialSortOptions;
  onExpenseSelect?: (expense: OperationalExpense) => void;
  onExpenseEdit?: (expenseId: string) => void;
  allowApproval?: boolean;
  compact?: boolean;
}

// =============================================
// Utility Types
// =============================================

export interface FinancialValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FinancialOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  validationErrors?: FinancialValidationError[];
}

export type FinancialAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'pay'
  | 'cancel';

export interface FinancialAuditLog {
  id: string;
  entityType: 'budget' | 'expense' | 'allocation' | 'category';
  entityId: string;
  action: FinancialAction;
  performedBy: string;
  performedAt: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  notes?: string;
}

// =============================================
// Permission Types
// =============================================

export interface FinancialPermissions {
  canViewBudgets: boolean;
  canCreateBudgets: boolean;
  canEditBudgets: boolean;
  canDeleteBudgets: boolean;
  canApproveBudgets: boolean;
  canViewExpenses: boolean;
  canCreateExpenses: boolean;
  canEditExpenses: boolean;
  canDeleteExpenses: boolean;
  canApproveExpenses: boolean;
  maxApprovalAmount: number;
  canViewFinancialReports: boolean;
  canExportFinancialData: boolean;
  canManageCategories: boolean;
  canClosePeriods: boolean;
}