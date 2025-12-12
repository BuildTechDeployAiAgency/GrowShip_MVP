import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FinancialDashboardMetrics, BudgetSummary, ExpenseSummary } from '@/types/financial';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || profile.brand_id;
    const distributorId = searchParams.get('distributorId') || profile.distributor_id;
    const fiscalYear = parseInt(searchParams.get('fiscalYear') || new Date().getFullYear().toString());
    const period = searchParams.get('period') || 'annual';

    // Check if user can view financial data for requested brand/distributor
    const isSuperAdmin = profile.role_name === "super_admin";
    const hasFinancialAccess = isSuperAdmin || 
      (brandId && profile.brand_id === brandId) ||
      (distributorId && profile.distributor_id === distributorId);

    if (!hasFinancialAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
      // Get budget summary
      const budgetSummary = await getBudgetSummary(supabase, brandId, distributorId, fiscalYear);
      
      // Get expense summary
      const expenseSummary = await getExpenseSummary(supabase, brandId, distributorId, fiscalYear);
      
      // Get top expense categories
      const topExpenseCategories = await getTopExpenseCategories(supabase, brandId, distributorId, fiscalYear);
      
      // Get budget utilization by category
      const budgetUtilizationByCategory = await getBudgetUtilizationByCategory(supabase, brandId, distributorId, fiscalYear);
      
      // Get monthly trends
      const monthlyTrends = await getMonthlyTrends(supabase, brandId, distributorId, fiscalYear);
      
      // Get department performance
      const departmentPerformance = await getDepartmentPerformance(supabase, brandId, distributorId, fiscalYear);
      
      // Get pending approvals count
      const pendingApprovals = await getPendingApprovalsCount(supabase, brandId, distributorId);
      
      // Get recent expenses
      const recentExpenses = await getRecentExpenses(supabase, brandId, distributorId);
      
      // Get budget alerts
      const budgetAlerts = await getBudgetAlerts(supabase, brandId, distributorId);

      const dashboardMetrics: FinancialDashboardMetrics = {
        budgetSummary,
        expenseSummary,
        topExpenseCategories,
        budgetUtilizationByCategory,
        monthlyTrends,
        departmentPerformance,
        pendingApprovals,
        upcomingBudgetExpirations: [], // Will be populated by getBudgetExpirations if needed
        recentExpenses,
        budgetAlerts
      };

      return NextResponse.json(dashboardMetrics);

    } catch (analyticsError) {
      console.error('Error in analytics aggregation:', analyticsError);
      return NextResponse.json({ error: "Failed to fetch analytics data" }, { status: 500 });
    }

  } catch (error) {
    console.error('Unexpected error in financial analytics API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions for analytics calculations

async function getBudgetSummary(supabase: any, brandId?: string, distributorId?: string, fiscalYear?: number): Promise<BudgetSummary> {
  let query = supabase
    .from('financial_budgets')
    .select('planned_amount, allocated_amount, spent_amount, remaining_amount, status');

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);
  if (fiscalYear) query = query.eq('fiscal_year', fiscalYear);

  const { data: budgets, error } = await query;

  if (error) throw error;

  const summary = budgets?.reduce((acc, budget) => ({
    totalBudgets: acc.totalBudgets + 1,
    totalPlannedAmount: acc.totalPlannedAmount + (budget.planned_amount || 0),
    totalAllocatedAmount: acc.totalAllocatedAmount + (budget.allocated_amount || 0),
    totalSpentAmount: acc.totalSpentAmount + (budget.spent_amount || 0),
    totalRemainingAmount: acc.totalRemainingAmount + (budget.remaining_amount || 0),
    overBudgetCount: acc.overBudgetCount + (budget.spent_amount > budget.allocated_amount ? 1 : 0),
    alertCount: acc.alertCount + (budget.spent_amount / budget.allocated_amount > 0.8 ? 1 : 0)
  }), {
    totalBudgets: 0,
    totalPlannedAmount: 0,
    totalAllocatedAmount: 0,
    totalSpentAmount: 0,
    totalRemainingAmount: 0,
    overBudgetCount: 0,
    alertCount: 0,
    averageUtilization: 0
  });

  if (summary && summary.totalAllocatedAmount > 0) {
    summary.averageUtilization = (summary.totalSpentAmount / summary.totalAllocatedAmount) * 100;
  }

  return summary || {
    totalBudgets: 0,
    totalPlannedAmount: 0,
    totalAllocatedAmount: 0,
    totalSpentAmount: 0,
    totalRemainingAmount: 0,
    averageUtilization: 0,
    overBudgetCount: 0,
    alertCount: 0
  };
}

async function getExpenseSummary(supabase: any, brandId?: string, distributorId?: string, fiscalYear?: number): Promise<ExpenseSummary> {
  let query = supabase
    .from('operational_expenses')
    .select('net_amount, status, expense_date');

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);
  
  // Filter by fiscal year if provided
  if (fiscalYear) {
    const fiscalYearStart = `${fiscalYear}-01-01`;
    const fiscalYearEnd = `${fiscalYear}-12-31`;
    query = query.gte('expense_date', fiscalYearStart).lte('expense_date', fiscalYearEnd);
  }

  const { data: expenses, error } = await query;

  if (error) throw error;

  const summary = expenses?.reduce((acc, expense) => ({
    totalExpenses: acc.totalExpenses + 1,
    totalAmount: acc.totalAmount + (expense.net_amount || 0),
    pendingApprovalAmount: acc.pendingApprovalAmount + (expense.status === 'pending_approval' ? (expense.net_amount || 0) : 0),
    approvedAmount: acc.approvedAmount + (expense.status === 'approved' ? (expense.net_amount || 0) : 0),
    paidAmount: acc.paidAmount + (expense.status === 'paid' ? (expense.net_amount || 0) : 0),
    overdueAmount: acc.overdueAmount + (expense.status === 'overdue' ? (expense.net_amount || 0) : 0),
  }), {
    totalExpenses: 0,
    totalAmount: 0,
    pendingApprovalAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
    averageExpenseAmount: 0
  });

  if (summary && summary.totalExpenses > 0) {
    summary.averageExpenseAmount = summary.totalAmount / summary.totalExpenses;
  }

  return summary || {
    totalExpenses: 0,
    totalAmount: 0,
    pendingApprovalAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
    averageExpenseAmount: 0
  };
}

async function getTopExpenseCategories(supabase: any, brandId?: string, distributorId?: string, fiscalYear?: number) {
  let query = supabase
    .from('operational_expenses')
    .select(`
      expense_type,
      net_amount,
      status,
      expense_date
    `);

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);
  
  if (fiscalYear) {
    const fiscalYearStart = `${fiscalYear}-01-01`;
    const fiscalYearEnd = `${fiscalYear}-12-31`;
    query = query.gte('expense_date', fiscalYearStart).lte('expense_date', fiscalYearEnd);
  }

  const { data: expenses, error } = await query;

  if (error) throw error;

  if (!expenses) return [];

  // Group by expense type
  const grouped = expenses.reduce((acc: any, expense) => {
    const type = expense.expense_type;
    if (!acc[type]) {
      acc[type] = {
        expenseType: type,
        count: 0,
        totalAmount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        paidAmount: 0
      };
    }
    
    acc[type].count += 1;
    acc[type].totalAmount += expense.net_amount || 0;
    
    if (expense.status === 'pending_approval') acc[type].pendingAmount += expense.net_amount || 0;
    else if (expense.status === 'approved') acc[type].approvedAmount += expense.net_amount || 0;
    else if (expense.status === 'paid') acc[type].paidAmount += expense.net_amount || 0;
    
    return acc;
  }, {});

  // Calculate percentages and sort by total amount
  const total = Object.values(grouped).reduce((sum: number, cat: any) => sum + cat.totalAmount, 0);
  
  return Object.values(grouped)
    .map((cat: any) => ({
      ...cat,
      averageAmount: cat.count > 0 ? cat.totalAmount / cat.count : 0,
      percentage: total > 0 ? (cat.totalAmount / total) * 100 : 0
    }))
    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    .slice(0, 10); // Top 10 categories
}

async function getBudgetUtilizationByCategory(supabase: any, brandId?: string, distributorId?: string, fiscalYear?: number) {
  let query = supabase
    .from('financial_budgets')
    .select(`
      id,
      budget_name,
      planned_amount,
      allocated_amount,
      spent_amount,
      remaining_amount,
      variance_percentage,
      budget_categories (
        name,
        category_type
      )
    `);

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);
  if (fiscalYear) query = query.eq('fiscal_year', fiscalYear);

  const { data: budgets, error } = await query;

  if (error) throw error;

  return (budgets || []).map(budget => ({
    budgetId: budget.id,
    budgetName: budget.budget_name,
    plannedAmount: budget.planned_amount || 0,
    actualAmount: budget.spent_amount || 0,
    variance: budget.variance_amount || 0,
    variancePercentage: budget.variance_percentage || 0,
    isOverBudget: (budget.spent_amount || 0) > (budget.allocated_amount || 0),
    utilizationPercentage: (budget.allocated_amount || 0) > 0 ? ((budget.spent_amount || 0) / (budget.allocated_amount || 0)) * 100 : 0,
    remainingDays: 0, // Would need to calculate based on period end date
    projectedSpend: budget.spent_amount || 0, // Could add projection logic
    category: budget.budget_categories?.name || 'Unknown'
  }));
}

async function getMonthlyTrends(supabase: any, brandId?: string, distributorId?: string, fiscalYear?: number) {
  // This would require more complex SQL aggregation - simplified version
  const months = [];
  const currentYear = fiscalYear || new Date().getFullYear();
  
  for (let month = 1; month <= 12; month++) {
    months.push({
      month: `${currentYear}-${month.toString().padStart(2, '0')}`,
      year: currentYear,
      plannedAmount: 0, // Would aggregate from budgets
      actualAmount: 0, // Would aggregate from expenses
      variance: 0,
      variancePercentage: 0,
      expenseCount: 0
    });
  }
  
  return months;
}

async function getDepartmentPerformance(supabase: any, brandId?: string, distributorId?: string, fiscalYear?: number) {
  // This would require joining budgets and expenses by department
  return [];
}

async function getPendingApprovalsCount(supabase: any, brandId?: string, distributorId?: string): Promise<number> {
  let query = supabase
    .from('operational_expenses')
    .select('id', { count: 'exact' })
    .eq('status', 'pending_approval');

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

async function getRecentExpenses(supabase: any, brandId?: string, distributorId?: string) {
  let query = supabase
    .from('operational_expenses')
    .select(`
      id,
      expense_number,
      description,
      net_amount,
      currency,
      expense_date,
      vendor_name,
      status,
      expense_type
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function getBudgetAlerts(supabase: any, brandId?: string, distributorId?: string) {
  let query = supabase
    .from('financial_budgets')
    .select(`
      id,
      budget_name,
      allocated_amount,
      spent_amount,
      variance_percentage
    `)
    .or('variance_percentage.lt.-20,variance_percentage.gt.20'); // Alerts for >20% variance

  if (brandId) query = query.eq('brand_id', brandId);
  if (distributorId) query = query.eq('distributor_id', distributorId);

  const { data: budgets, error } = await query;

  if (error) throw error;

  return (budgets || []).map(budget => ({
    id: `budget-alert-${budget.id}`,
    budgetId: budget.id,
    budgetName: budget.budget_name,
    alertType: 'budget_threshold' as const,
    severity: Math.abs(budget.variance_percentage) > 50 ? 'critical' as const : 'warning' as const,
    message: budget.variance_percentage < 0 
      ? `Budget overrun: ${Math.abs(budget.variance_percentage).toFixed(1)}% over allocated amount`
      : `Budget underutilized: ${budget.variance_percentage.toFixed(1)}% under allocated amount`,
    currentValue: budget.spent_amount || 0,
    thresholdValue: budget.allocated_amount || 0,
    createdAt: new Date().toISOString()
  }));
}