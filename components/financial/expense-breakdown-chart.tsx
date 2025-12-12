"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialDashboard } from '@/hooks/use-financial-dashboard';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import { useDateFilters } from '@/hooks/use-date-filters';
import type { FinancialFilters } from '@/types/financial';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { PieChart as PieChartIcon, BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ExpenseBreakdownChartProps {
  className?: string;
  chartType?: 'pie' | 'bar';
}

// Color palette for expense categories
const EXPENSE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6b7280', // gray
];

export function ExpenseBreakdownChart({ 
  className,
  chartType = 'pie' 
}: ExpenseBreakdownChartProps = {}) {
  const { user, profile } = useEnhancedAuth();
  const { filters } = useDateFilters();
  const [currentChartType, setCurrentChartType] = useState<'pie' | 'bar'>(chartType);

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
    if (!data?.topExpenseCategories) return [];

    return data.topExpenseCategories
      .map((category, index) => ({
        name: formatExpenseTypeName(category.expenseType),
        value: category.totalAmount,
        count: category.count,
        percentage: category.percentage,
        averageAmount: category.averageAmount,
        pendingAmount: category.pendingAmount,
        approvedAmount: category.approvedAmount,
        paidAmount: category.paidAmount,
        color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
        fill: EXPENSE_COLORS[index % EXPENSE_COLORS.length], // For recharts
      }))
      .filter(item => item.value > 0) // Only show categories with expenses
      .slice(0, 10); // Show top 10 categories
  }, [data]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!chartData.length) return null;

    const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);
    const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
    const averageExpense = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      totalAmount,
      totalCount,
      averageExpense,
      topCategory: chartData[0]?.name || 'N/A',
      topCategoryPercentage: chartData[0]?.percentage || 0,
    };
  }, [chartData]);

  // Format expense type names for display
  function formatExpenseTypeName(expenseType: string): string {
    return expenseType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Custom tooltip for pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">${(data.value / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Percentage:</span>
              <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Count:</span>
              <span className="font-medium">{data.count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Amount:</span>
              <span className="font-medium">${(data.averageAmount / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">${(data.value / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid:</span>
              <span className="font-medium text-green-600">${(data.paidAmount / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Approved:</span>
              <span className="font-medium text-blue-600">${(data.approvedAmount / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium text-orange-600">${(data.pendingAmount / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300", className)}>
        <div className="bg-gradient-to-r from-green-500 to-teal-500 h-1 w-full"></div>
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Expense Breakdown</CardTitle>
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
          <CardTitle className="text-xl font-bold text-gray-900">Expense Breakdown</CardTitle>
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
        <div className="bg-gradient-to-r from-green-500 to-teal-500 h-1 w-full"></div>
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-xl font-bold text-gray-900">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <PieChartIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No expense data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300", className)}>
      <div className="bg-gradient-to-r from-green-500 to-teal-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Expense Breakdown</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Expenses by category</p>
          </div>
          <div className="flex items-center gap-2">
            {summaryStats && (
              <div className="text-right bg-gradient-to-br from-green-50 to-teal-50 rounded-xl px-4 py-3 mr-4">
                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  ${(summaryStats.totalAmount / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-gray-600">Total Expenses</p>
                <p className="text-xs text-gray-600">{summaryStats.totalCount} transactions</p>
              </div>
            )}
            <div className="flex rounded-lg border border-gray-200 bg-gray-50">
              <button
                onClick={() => setCurrentChartType('pie')}
                className={cn(
                  "p-2 rounded-l-lg transition-colors",
                  currentChartType === 'pie' 
                    ? "bg-white text-green-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
                title="Pie Chart"
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentChartType('bar')}
                className={cn(
                  "p-2 rounded-r-lg transition-colors",
                  currentChartType === 'bar' 
                    ? "bg-white text-green-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
                title="Bar Chart"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          {currentChartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={140}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
            </PieChart>
          ) : (
            <BarChart 
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
              <Tooltip content={<BarTooltip />} />
              <Legend />
              <Bar 
                dataKey="paidAmount" 
                name="Paid"
                stackId="status"
                fill="#10b981" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="approvedAmount" 
                name="Approved"
                stackId="status"
                fill="#3b82f6" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="pendingAmount" 
                name="Pending"
                stackId="status"
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Summary information */}
        {summaryStats && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{summaryStats.totalCount}</p>
                <p className="text-sm text-gray-600">Total Expenses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${(summaryStats.averageExpense / 1000).toFixed(1)}k</p>
                <p className="text-sm text-gray-600">Avg per Expense</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summaryStats.topCategory}</p>
                <p className="text-sm text-gray-600">Top Category</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summaryStats.topCategoryPercentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">of Total</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}