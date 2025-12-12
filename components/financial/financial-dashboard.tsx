"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FinancialMetricsCards } from './financial-metrics-cards';
import { BudgetUtilizationChart } from './budget-utilization-chart';
import { ExpenseBreakdownChart } from './expense-breakdown-chart';
import { BudgetFormDialog } from './budget-form-dialog';
import { ExpenseFormDialog } from './expense-form-dialog';
import { GenerateReportDialog } from './generate-report-dialog';
import { FinancialApprovalNotifications } from './approval-notifications';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import { useDateFilters } from '@/hooks/use-date-filters';
import { 
  CalendarDays, 
  Download, 
  Filter,
  RefreshCw,
  Settings,
  TrendingUp,
  DollarSign,
  Plus,
  FileText,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialDashboardProps } from '@/types/financial';

export function FinancialDashboard({
  brandId,
  distributorId,
  fiscalYear,
  period = 'annual',
  showComparison = true,
}: FinancialDashboardProps = {}) {
  const { profile } = useEnhancedAuth();
  const { filters, updateFilters } = useDateFilters();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedYear, setSelectedYear] = useState(fiscalYear || new Date().getFullYear());
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [approvalsDialogOpen, setApprovalsDialogOpen] = useState(false);

  // Handle period change
  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    updateFilters({ period: newPeriod });
  };

  // Handle year change
  const handleYearChange = (newYear: string) => {
    const year = parseInt(newYear);
    setSelectedYear(year);
    updateFilters({ year });
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // This would trigger a refetch of all dashboard data
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Generate year options (current year ± 3 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            Financial Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive financial management and analytics
          </p>
        </div>
        
        {/* Dashboard Controls */}
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Metrics Overview Cards */}
      <FinancialMetricsCards />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Budget Utilization Chart */}
        <BudgetUtilizationChart showComparison={showComparison} />
        
        {/* Expense Breakdown Chart */}
        <ExpenseBreakdownChart />
      </div>

      {/* Additional Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Performance Summary */}
        <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-1 w-full"></div>
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Budget Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-sm text-gray-600">Active Budgets</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">85%</p>
                  <p className="text-sm text-gray-600">On Track</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Marketing</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">75%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Operations</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">95%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Technology</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '110%' }}></div>
                    </div>
                    <span className="text-sm text-red-600">110%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 w-full"></div>
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5 text-purple-600" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Marketing Q4 Budget Approved</p>
                  <p className="text-xs text-gray-600">2 hours ago</p>
                </div>
                <span className="text-sm font-medium text-blue-600">$45,000</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Office Supplies Expense Paid</p>
                  <p className="text-xs text-gray-600">1 day ago</p>
                </div>
                <span className="text-sm font-medium text-green-600">$1,250</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Travel Expense Pending</p>
                  <p className="text-xs text-gray-600">2 days ago</p>
                </div>
                <span className="text-sm font-medium text-orange-600">$3,500</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">IT Budget Over Threshold</p>
                  <p className="text-xs text-gray-600">3 days ago</p>
                </div>
                <span className="text-sm font-medium text-red-600">Alert</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button variant="outline" size="sm" className="w-full">
                View All Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Quick Actions</h3>
              <p className="text-blue-100 mt-1">Manage your financial operations efficiently</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setBudgetDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Budget
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setExpenseDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setReportDialogOpen(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setApprovalsDialogOpen(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Review Approvals
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BudgetFormDialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        onSuccess={() => {
          handleRefresh();
        }}
      />

      <ExpenseFormDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        onSuccess={() => {
          handleRefresh();
        }}
      />

      <GenerateReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />

      {/* Approvals Dialog */}
      <Dialog open={approvalsDialogOpen} onOpenChange={setApprovalsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Financial Approvals</DialogTitle>
            <DialogDescription>
              Review and manage pending budget and expense approvals
            </DialogDescription>
          </DialogHeader>
          <FinancialApprovalNotifications 
            onViewAll={() => {
              // Navigate to dedicated approvals page or expand view
              console.log('View all approvals');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}