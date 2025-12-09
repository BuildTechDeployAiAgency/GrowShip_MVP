export interface CustomerFinancialMetrics {
  customerId: string;
  customerName: string;
  
  // Outstanding Receivables
  totalOutstandingReceivables: number;
  receivablesAging: ReceivablesAging;
  
  // Outstanding Payables  
  totalOutstandingPayables: number;
  payablesBreakdown: PayablesBreakdown;
  
  // Days Sales Outstanding
  currentDSO: number;
  averageDSO: number;
  dsoTrend: DSOTrendData[];
  
  // Additional metrics
  averagePaymentDays: number;
  creditLimit?: number;
  creditUtilization?: number;
  
  // Payment performance metrics
  onTimePaymentRate: number;
  earlyPaymentRate: number;
  latePaymentRate: number;
  riskScore: number;
  
  // Summary stats
  totalInvoicesCount: number;
  totalOrdersCount: number;
  lifetimeValue: number;
  
  // Last updated
  lastCalculated: string;
}

export interface ReceivablesAging {
  current: AgingBucket; // 0-30 days
  days31to60: AgingBucket; // 31-60 days  
  days61to90: AgingBucket; // 61-90 days
  over90Days: AgingBucket; // 90+ days
  totalAmount: number;
  totalInvoices: number;
}

export interface AgingBucket {
  amount: number;
  invoiceCount: number;
  percentage: number;
  invoices: AgingInvoiceDetail[];
}

export interface AgingInvoiceDetail {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  paymentStatus: string;
}

export interface PayablesBreakdown {
  creditMemos: number;
  refundsPending: number;
  overpayments: number;
  returnAuthorizations: number;
  totalAmount: number;
}

export interface DSOTrendData {
  date: string;
  dso: number;
  averageDSO: number;
}

export interface CustomerPaymentPerformance {
  customerId: string;
  
  // Payment patterns
  averagePaymentDays: number;
  onTimePaymentRate: number; // Percentage of invoices paid on time
  earlyPaymentRate: number; // Percentage paid early
  latePaymentRate: number; // Percentage paid late
  
  // Payment history
  paymentHistory: PaymentHistoryItem[];
  
  // Cash flow patterns
  monthlyPaymentPattern: MonthlyPaymentData[];
  seasonalTrends: SeasonalTrendData[];
  
  // Risk indicators
  riskScore: number; // 1-10, higher is riskier
  riskFactors: string[];
  creditRecommendation: "increase" | "maintain" | "decrease" | "hold";
}

export interface PaymentHistoryItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paidDate: string;
  invoiceAmount: number;
  paidAmount: number;
  daysToPay: number;
  paymentMethod: string;
  isLate: boolean;
  isEarly: boolean;
}

export interface MonthlyPaymentData {
  month: string;
  totalInvoiced: number;
  totalPaid: number;
  averageDaysToPay: number;
  invoiceCount: number;
}

export interface SeasonalTrendData {
  quarter: string;
  averageDSO: number;
  paymentVelocity: number;
  riskLevel: "low" | "medium" | "high";
}

// Request/Response types for API
export interface CustomerFinancialRequest {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  includeProjections?: boolean;
}

export interface ReceivablesAgingRequest {
  customerId: string;
  asOfDate?: string;
}

export interface DSOCalculationRequest {
  customerId: string;
  periodDays?: number; // Default 90 days
  calculationMethod?: "standard" | "weighted" | "rolling";
}

// Filter and sorting options
export interface FinancialMetricsFilters {
  dateRange: {
    from: string;
    to: string;
  };
  includeOverdue?: boolean;
  minimumAmount?: number;
  paymentStatus?: string[];
}

export interface AgingSortOptions {
  sortBy: "amount" | "date" | "daysOverdue" | "invoiceNumber";
  sortDirection: "asc" | "desc";
}

// Dashboard summary types
export interface CustomerFinancialSummary {
  totalReceivables: number;
  totalPayables: number;
  netPosition: number; // receivables - payables
  currentDSO: number;
  riskLevel: "low" | "medium" | "high";
  lastPaymentDate: string;
  nextPaymentDue: string;
  creditStatus: "good" | "warning" | "critical";
}

export interface FinancialAlert {
  id: string;
  type: "overdue" | "credit_limit" | "payment_pattern" | "dso_increase";
  severity: "info" | "warning" | "critical";
  message: string;
  amount?: number;
  daysOverdue?: number;
  createdAt: string;
  acknowledged: boolean;
}

// Component props interfaces
export interface CustomerFinancialMetricsProps {
  customerId: string;
  customerName: string;
  onDataUpdate?: (metrics: CustomerFinancialMetrics) => void;
}

export interface ReceivablesAgingTableProps {
  customerId: string;
  onInvoiceClick?: (invoiceId: string) => void;
  filters?: FinancialMetricsFilters;
}

export interface PaymentPerformanceChartProps {
  customerId: string;
  chartType: "dso" | "payment_velocity" | "aging_trend";
  timeframe: "30d" | "90d" | "12m" | "24m";
}