"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialDashboard } from '@/hooks/use-financial-dashboard';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import { useDateFilters } from '@/hooks/use-date-filters';
import type { FinancialFilters } from '@/types/financial';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  PieChart,
  Calculator,
  Clock,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialMetricsCardsProps {
  initialData?: any;
}

export function FinancialMetricsCards({ initialData }: FinancialMetricsCardsProps = {}) {
  const { user } = useEnhancedAuth();
  const { profile } = useEnhancedAuth();
  const { filters } = useDateFilters();

  // Build financial filters
  const financialFilters: FinancialFilters = useMemo(() => ({
    brandId: profile?.brand_id,
    distributorId: profile?.distributor_id,
    fiscalYear: filters.year || new Date().getFullYear(),
    period: filters.period || 'annual',
  }), [profile, filters]);

  const { data, isLoading, error } = useFinancialDashboard({
    filters: financialFilters,
    enabled: !!user && !!profile,
    initialData,
  });

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage helper
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const metrics = useMemo(() => {
    if (!data) return [];

    const budgetSummary = data.budgetSummary;
    const expenseSummary = data.expenseSummary;

    return [
      {
        title: "Total Budget",
        value: formatCurrency(budgetSummary.totalAllocatedAmount),
        subtitle: `${budgetSummary.totalBudgets} budgets`,
        change: budgetSummary.totalRemainingAmount,
        changeDisplay: `${formatCurrency(budgetSummary.totalRemainingAmount)} remaining`,
        isPositive: budgetSummary.totalRemainingAmount >= 0,
        icon: DollarSign,
        color: "bg-blue-500",
        bgColor: "bg-blue-50",
      },
      {
        title: "Total Spending",
        value: formatCurrency(expenseSummary.totalAmount),
        subtitle: `${expenseSummary.totalExpenses} expenses`,
        change: budgetSummary.averageUtilization,
        changeDisplay: `${formatPercentage(budgetSummary.averageUtilization)} utilized`,
        isPositive: budgetSummary.averageUtilization <= 90,
        icon: Calculator,
        color: "bg-green-500",
        bgColor: "bg-green-50",
      },
      {
        title: "Pending Approvals",
        value: formatCurrency(expenseSummary.pendingApprovalAmount),
        subtitle: `${data.pendingApprovals} expenses`,
        change: expenseSummary.overdueAmount,
        changeDisplay: expenseSummary.overdueAmount > 0 ? `${formatCurrency(expenseSummary.overdueAmount)} overdue` : 'All current',
        isPositive: expenseSummary.overdueAmount === 0,
        icon: Clock,
        color: "bg-orange-500",
        bgColor: "bg-orange-50",
      },
      {
        title: "Budget Utilization",
        value: formatPercentage(budgetSummary.averageUtilization),
        subtitle: `${budgetSummary.overBudgetCount} over budget`,
        change: budgetSummary.alertCount,
        changeDisplay: budgetSummary.alertCount > 0 ? `${budgetSummary.alertCount} alerts` : 'All on track',
        isPositive: budgetSummary.alertCount === 0,
        icon: PieChart,
        color: "bg-purple-500",
        bgColor: "bg-purple-50",
      },
      {
        title: "Variance Analysis",
        value: formatCurrency(Math.abs(budgetSummary.totalAllocatedAmount - budgetSummary.totalSpentAmount)),
        subtitle: "Budget vs actual",
        change: ((budgetSummary.totalAllocatedAmount - budgetSummary.totalSpentAmount) / budgetSummary.totalAllocatedAmount) * 100,
        changeDisplay: budgetSummary.totalAllocatedAmount - budgetSummary.totalSpentAmount >= 0 ? 'Under budget' : 'Over budget',
        isPositive: budgetSummary.totalAllocatedAmount - budgetSummary.totalSpentAmount >= 0,
        icon: TrendingUp,
        color: "bg-indigo-500",
        bgColor: "bg-indigo-50",
      },
      {
        title: "Risk Indicators",
        value: budgetSummary.alertCount.toString(),
        subtitle: "Active alerts",
        change: budgetSummary.overBudgetCount,
        changeDisplay: budgetSummary.overBudgetCount > 0 ? `${budgetSummary.overBudgetCount} over budget` : 'All within budget',
        isPositive: budgetSummary.overBudgetCount === 0,
        icon: AlertCircle,
        color: "bg-red-500",
        bgColor: "bg-red-50",
      },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
        <Card className="bg-white shadow-sm border border-red-200 col-span-full">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <div className="text-red-600">
                <p className="font-semibold">Error Loading Financial Data</p>
                <p className="text-sm mt-2">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={index} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium text-gray-600 truncate">
                    {metric.title}
                  </CardTitle>
                </div>
                <div className={cn("rounded-lg p-2 ml-2", metric.bgColor)}>
                  <Icon className={cn("h-5 w-5 text-white", metric.color.replace('bg-', 'text-'))} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </div>
                  <div className="text-xs text-gray-500">
                    {metric.subtitle}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className={cn(
                    "text-xs font-medium",
                    metric.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {metric.changeDisplay}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}