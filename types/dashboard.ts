export interface DashboardMetrics {
  total_revenue: number;
  total_revenue_display: string;
  revenue_growth_percentage: number;
  revenue_growth_display: string;

  profit_margin: number;
  profit_margin_display: string;
  profit_margin_growth_percentage: number;
  profit_margin_growth_display: string;

  target_achievement: number;
  target_achievement_display: string;
  target_period: string;

  pending_orders_count: number;
  pending_orders_count_display: string;
  pending_orders_value: number;
  pending_orders_value_display: string;
}

export interface DashboardMetricsFilters {
  tableSuffix?: string;
  userId?: string;
  brandId?: string;
  userRole?: string;
  distributorId?: string;
  year?: number;
  month?: number;
}

