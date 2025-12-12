"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialDashboard } from '@/hooks/use-financial-dashboard';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import { useDateFilters } from '@/hooks/use-date-filters';
import type { FinancialFilters } from '@/types/financial';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetUtilizationChartProps {
  className?: string;
  showComparison?: boolean;
}

export function BudgetUtilizationChart({ 
  className,
  showComparison = true 
}: BudgetUtilizationChartProps = {}) {
  const { user, profile } = useEnhancedAuth();
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
  });

  // Process chart data
  const chartData = useMemo(() => {
    if (!data?.budgetUtilizationByCategory) return [];

    return data.budgetUtilizationByCategory
      .map(budget => ({
        name: budget.budgetName.length > 15 
          ? `${budget.budgetName.substring(0, 15)}...` 
          : budget.budgetName,
        fullName: budget.budgetName,
        category: budget.category,
        allocated: budget.plannedAmount,
        spent: budget.actualAmount,
        remaining: budget.plannedAmount - budget.actualAmount,
        utilization: budget.utilizationPercentage,
        variance: budget.variance,
        variancePercentage: budget.variancePercentage,
        isOverBudget: budget.isOverBudget,
        status: budget.isOverBudget ? 'over' : budget.utilizationPercentage > 90 ? 'warning' : 'good',
      }))
      .sort((a, b) => b.utilization - a.utilization) // Sort by utilization descending
      .slice(0, 10); // Show top 10 budgets
  }, [data]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!chartData.length) return null;

    const totalAllocated = chartData.reduce((sum, item) => sum + item.allocated, 0);
    const totalSpent = chartData.reduce((sum, item) => sum + item.spent, 0);
    const overBudgetCount = chartData.filter(item => item.isOverBudget).length;
    const avgUtilization = chartData.reduce((sum, item) => sum + item.utilization, 0) / chartData.length;

    return {
      totalAllocated,
      totalSpent,
      overBudgetCount,
      avgUtilization,
      efficiency: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0,
    };
  }, [chartData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
          <p className="text-sm text-gray-600 mb-2">Category: {data.category}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Allocated:</span>
              <span className="font-medium">${(data.allocated / 1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Spent:</span>
              <span className="font-medium">${(data.spent / 1000).toFixed(0)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className={cn(
                "font-medium",
                data.remaining >= 0 ? "text-green-600" : "text-red-600"
              )}>
                ${Math.abs(data.remaining / 1000).toFixed(0)}k
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Utilization:</span>
              <span className={cn(
                "font-medium",
                data.utilization > 100 ? "text-red-600" : 
                data.utilization > 90 ? "text-orange-600" : "text-green-600"
              )}>
                {data.utilization.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get bar color based on status
  const getBarColor = (status: string) => {
    switch (status) {
      case 'over': return '#ef4444'; // red-500
      case 'warning': return '#f59e0b'; // amber-500
      case 'good': return '#10b981'; // emerald-500
      default: return '#6b7280'; // gray-500
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300", className)}>
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 w-full"></div>
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Budget Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("bg-white rounded-xl shadow-lg border-0 overflow-hidden", className)}>
        <div className="bg-gradient-to-r from-red-500 to-pink-500 h-1 w-full"></div>
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Budget Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <div className="text-red-600">
              <p className="font-semibold">Error Loading Chart Data</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className={cn("bg-white rounded-xl shadow-lg border-0 overflow-hidden", className)}>
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 w-full"></div>
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Budget Utilization Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No budget data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300", className)}>
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Budget Utilization Analysis</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Top 10 budgets by utilization percentage</p>
          </div>
          {summaryStats && (
            <div className="text-right bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {summaryStats.avgUtilization.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">Average Utilization</p>
              {summaryStats.overBudgetCount > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  {summaryStats.overBudgetCount} over budget
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart 
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280" 
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6b7280" 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              style={{ fontSize: "12px" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar 
              dataKey="allocated" 
              name="Allocated Budget"
              fill="#d1d5db" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="spent" 
              name="Amount Spent"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.status)} 
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend for status colors */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-gray-600">Under 90% (Good)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span className="text-gray-600">90-100% (Warning)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Over 100% (Over Budget)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}