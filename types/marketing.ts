// Marketing Campaign Types and Interfaces
// Comprehensive type definitions for marketing campaign tracking and ROI analysis

// =============================================
// Core Campaign Types
// =============================================

export type CampaignType = 
  | 'brand_awareness'
  | 'product_launch' 
  | 'seasonal'
  | 'promotional'
  | 'digital_marketing'
  | 'trade_show'
  | 'print_advertising'
  | 'content_marketing'
  | 'social_media'
  | 'email_marketing'
  | 'influencer'
  | 'partnership';

export type CampaignChannel = 
  | 'digital'
  | 'print'
  | 'radio'
  | 'tv'
  | 'outdoor'
  | 'social_media'
  | 'email'
  | 'content'
  | 'events'
  | 'partnerships'
  | 'direct_mail';

export type CampaignStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'under_review';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'requires_revision';

export type FundSource = 
  | 'brand_direct'
  | 'mdf'
  | 'coop'
  | 'distributor_self'
  | 'shared';

// =============================================
// Main Campaign Interface
// =============================================

export interface MarketingCampaign {
  id: string;
  
  // Basic Information
  name: string;
  description?: string;
  campaignCode?: string;
  
  // Hierarchy and Ownership
  brandId: string;
  distributorId?: string;
  regionId?: string;
  countryCode?: string;
  
  // Campaign Classification
  campaignType: CampaignType;
  channel: CampaignChannel;
  targetAudience?: string;
  
  // Budget and Financial
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  
  // Fund Allocation
  fundSource?: FundSource;
  brandContribution: number;
  distributorContribution: number;
  
  // Timeline
  startDate: string;
  endDate: string;
  launchDate?: string;
  
  // Status
  status: CampaignStatus;
  approvalStatus: ApprovalStatus;
  
  // Performance Targets
  targetReach?: number;
  targetImpressions?: number;
  targetLeads?: number;
  targetSalesAmount?: number;
  targetRoiPercentage?: number;
  
  // Actual Performance
  actualReach: number;
  actualImpressions: number;
  actualLeads: number;
  actualSalesAmount: number;
  actualRoiPercentage: number;
  
  // ROI Calculations
  totalRevenue: number;
  attributedOrders: number;
  costPerAcquisition?: number;
  returnOnAdSpend?: number;
  
  // Approval and Tracking
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Metadata
  tags?: string[];
  externalCampaignId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Campaign Expenses
// =============================================

export type ExpenseType = 
  | 'advertising'
  | 'content_creation'
  | 'design'
  | 'media_buy'
  | 'events'
  | 'materials'
  | 'personnel'
  | 'technology'
  | 'analytics'
  | 'other';

export type ExpenseStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface CampaignExpense {
  id: string;
  campaignId: string;
  
  // Expense Details
  expenseType: ExpenseType;
  subcategory?: string;
  description: string;
  
  // Financial Details
  amount: number;
  currency: string;
  
  // Timing and Approval
  expenseDate: string;
  dueDate?: string;
  paidDate?: string;
  
  // Vendor Information
  vendorName?: string;
  vendorContact?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  
  // Approval Workflow
  status: ExpenseStatus;
  approvedBy?: string;
  approvedAt?: string;
  
  // Expense Categorization
  isRecurring: boolean;
  recurrencePattern?: string;
  allocationPercentage: number;
  
  // File Attachments
  receiptUrl?: string;
  invoiceUrl?: string;
  supportingDocs?: string[];
  
  // Tracking
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Performance Metrics
// =============================================

export interface CampaignPerformanceMetric {
  id: string;
  campaignId: string;
  
  // Metric Details
  metricDate: string;
  metricType: string;
  metricValue: number;
  metricUnit?: string;
  
  // Data Source
  dataSource?: string;
  externalId?: string;
  
  // Verification
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  
  createdAt: string;
}

// =============================================
// Order Attribution
// =============================================

export type AttributionType = 
  | 'direct'
  | 'influenced'
  | 'assisted'
  | 'last_touch'
  | 'first_touch'
  | 'multi_touch';

export type AttributionMethod = 
  | 'manual'
  | 'automated'
  | 'hybrid';

export interface CampaignOrderAttribution {
  id: string;
  campaignId: string;
  orderId: string;
  
  // Attribution Details
  attributionType: AttributionType;
  attributionWeight: number;
  attributionDate: string;
  
  // Financial Attribution
  attributedRevenue: number;
  attributedMargin?: number;
  
  // Tracking Source
  trackingCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  // Method and Verification
  attributionMethod: AttributionMethod;
  verifiedBy?: string;
  
  createdAt: string;
}

// =============================================
// ROI Analysis Types
// =============================================

export interface CampaignROISummary {
  campaignId: string;
  campaignName: string;
  campaignType: CampaignType;
  channel: CampaignChannel;
  totalBudget: number;
  spentBudget: number;
  totalRevenue: number;
  netProfit: number;
  roiPercentage: number;
  roas: number;
  costPerAcquisition: number;
  attributedOrders: number;
  budgetUtilization: number;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
}

export interface ChannelPerformance {
  channel: CampaignChannel;
  campaignCount: number;
  totalBudget: number;
  totalSpent: number;
  totalRevenue: number;
  averageRoi: number;
  averageRoas: number;
  totalOrders: number;
  averageCpa: number;
  budgetEfficiency: number;
}

export interface DistributorCampaignPerformance {
  distributorId: string;
  distributorName: string;
  campaignCount: number;
  totalAllocatedBudget: number;
  totalSpentBudget: number;
  totalRevenue: number;
  averageRoi: number;
  budgetUtilization: number;
  topPerformingChannel: CampaignChannel;
  underperformingCampaigns: number;
}

export interface CampaignExpenseBreakdown {
  expenseType: ExpenseType;
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
  percentageOfBudget: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface ROITrendData {
  periodStart: string;
  periodEnd: string;
  campaignCount: number;
  totalSpent: number;
  totalRevenue: number;
  averageRoi: number;
  averageRoas: number;
  cumulativeRoi: number;
}

// =============================================
// Budget Performance Types
// =============================================

export type BudgetStatus = 
  | 'over_budget'
  | 'near_budget_limit'
  | 'on_track'
  | 'under_utilized';

export type CampaignPhase = 
  | 'completed'
  | 'not_started'
  | 'active';

export interface CampaignBudgetPerformance {
  campaignId: string;
  campaignName: string;
  brandId: string;
  distributorId?: string;
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  budgetUtilizationPercentage: number;
  revenuePerDollarSpent: number;
  budgetStatus: BudgetStatus;
  startDate: string;
  endDate: string;
  campaignPhase: CampaignPhase;
  daysRemaining: number;
  projectedTotalSpend?: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Alert System Types
// =============================================

export type AlertType = 
  | 'budget_overrun'
  | 'poor_roi'
  | 'timeline_concern';

export type AlertSeverity = 
  | 'critical'
  | 'warning'
  | 'info';

export interface CampaignPerformanceAlert {
  campaignId: string;
  campaignName: string;
  alertType: AlertType;
  alertSeverity: AlertSeverity;
  alertMessage: string;
  metricValue: number;
  thresholdValue: number;
  createdAt: string;
}

// =============================================
// Request/Response Types
// =============================================

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  campaignType: CampaignType;
  channel: CampaignChannel;
  targetAudience?: string;
  totalBudget: number;
  allocatedBudget: number;
  brandId: string;
  distributorId?: string;
  regionId?: string;
  countryCode?: string;
  fundSource?: FundSource;
  brandContribution: number;
  distributorContribution: number;
  startDate: string;
  endDate: string;
  targetReach?: number;
  targetImpressions?: number;
  targetLeads?: number;
  targetRoiPercentage?: number;
  targetSalesAmount?: number;
  tags?: string[];
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string;
  status?: CampaignStatus;
  approvalStatus?: ApprovalStatus;
}

export interface CreateExpenseRequest {
  campaignId: string;
  expenseType: ExpenseType;
  subcategory?: string;
  description: string;
  amount: number;
  expenseDate: string;
  dueDate?: string;
  vendorName?: string;
  vendorContact?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  allocationPercentage?: number;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  id: string;
  status?: ExpenseStatus;
  paidDate?: string;
}

export interface CreateOrderAttributionRequest {
  campaignId: string;
  orderId: string;
  attributionType: AttributionType;
  attributionWeight: number;
  attributedRevenue: number;
  attributedMargin?: number;
  trackingCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  attributionMethod: AttributionMethod;
}

// =============================================
// Filter and Search Types
// =============================================

export interface CampaignFilters {
  brandId?: string;
  distributorId?: string;
  status?: CampaignStatus[];
  campaignType?: CampaignType[];
  channel?: CampaignChannel[];
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  minBudget?: number;
  maxBudget?: number;
  minROI?: number;
  maxROI?: number;
  regions?: string[];
  countries?: string[];
  tags?: string[];
  search?: string;
}

export interface CampaignSortOptions {
  field: keyof MarketingCampaign;
  direction: 'asc' | 'desc';
}

export interface CampaignListResponse {
  campaigns: MarketingCampaign[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// =============================================
// Dashboard and Analytics Types
// =============================================

export interface MarketingDashboardMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  spentBudget: number;
  totalRevenue: number;
  averageROI: number;
  averageROAS: number;
  topPerformingCampaign: MarketingCampaign;
  worstPerformingCampaign: MarketingCampaign;
  budgetUtilization: number;
  recentAlerts: CampaignPerformanceAlert[];
  channelPerformance: ChannelPerformance[];
  roiTrend: ROITrendData[];
}

export interface CampaignAnalytics {
  campaign: MarketingCampaign;
  expenseBreakdown: CampaignExpenseBreakdown[];
  performanceMetrics: CampaignPerformanceMetric[];
  orderAttributions: CampaignOrderAttribution[];
  budgetPerformance: CampaignBudgetPerformance;
  alerts: CampaignPerformanceAlert[];
  roiAnalysis: {
    dailyRevenue: { date: string; revenue: number; spend: number }[];
    cumulativeROI: { date: string; roi: number }[];
    channelComparison: ChannelPerformance[];
  };
}

// =============================================
// Component Props Types
// =============================================

export interface CampaignFormProps {
  campaign?: MarketingCampaign;
  onSubmit: (data: CreateCampaignRequest | UpdateCampaignRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  distributors?: { id: string; name: string }[];
  regions?: { id: string; name: string }[];
}

export interface CampaignListProps {
  filters?: CampaignFilters;
  sortOptions?: CampaignSortOptions;
  onCampaignSelect?: (campaign: MarketingCampaign) => void;
  onCampaignEdit?: (campaignId: string) => void;
  onCampaignDelete?: (campaignId: string) => void;
  allowSelection?: boolean;
  compact?: boolean;
}

export interface CampaignROIDashboardProps {
  brandId?: string;
  distributorId?: string;
  timeframe?: '30d' | '90d' | '12m' | '24m';
  onCampaignClick?: (campaignId: string) => void;
}

export interface ExpenseManagerProps {
  campaignId: string;
  onExpenseCreate?: (expense: CampaignExpense) => void;
  onExpenseUpdate?: (expense: CampaignExpense) => void;
  onExpenseDelete?: (expenseId: string) => void;
  allowEdit?: boolean;
}

export interface CampaignAnalyticsProps {
  campaignId: string;
  showComparison?: boolean;
  comparisonCampaignIds?: string[];
  timeframe?: string;
}

// =============================================
// Utility Types
// =============================================

export interface CampaignValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CampaignOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  validationErrors?: CampaignValidationError[];
}

export type CampaignAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'activate'
  | 'pause'
  | 'complete'
  | 'cancel';

export interface CampaignActionLog {
  id: string;
  campaignId: string;
  action: CampaignAction;
  performedBy: string;
  performedAt: string;
  previousValues?: Partial<MarketingCampaign>;
  newValues?: Partial<MarketingCampaign>;
  notes?: string;
}