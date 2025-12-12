"use client";

import { useState } from 'react';
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText,
  Download,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Calculator,
  Loader2,
  Eye
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancialReportsPage() {
  const { user, profile, loading } = useRequireProfile();
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  if (loading) {
    return (
      <MainLayout pageTitle="Financial Reports" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </MainLayout>
    );
  }

  // Mock report data
  const availableReports = [
    {
      id: "budget_variance",
      title: "Budget vs Actual Report",
      description: "Compare planned budgets against actual spending across departments and categories",
      icon: BarChart3,
      color: "blue",
      lastGenerated: "2024-12-08",
      type: "Variance Analysis",
    },
    {
      id: "expense_breakdown",
      title: "Expense Breakdown Report", 
      description: "Detailed analysis of expenses by category, department, and time period",
      icon: PieChart,
      color: "green",
      lastGenerated: "2024-12-08",
      type: "Expense Analysis",
    },
    {
      id: "pl_statement",
      title: "Profit & Loss Statement",
      description: "Comprehensive P&L statement with revenue, expenses, and net income",
      icon: TrendingUp,
      color: "purple",
      lastGenerated: "2024-12-07",
      type: "Financial Statement",
    },
    {
      id: "cash_flow",
      title: "Cash Flow Report",
      description: "Track cash inflows and outflows with projected cash positions",
      icon: DollarSign,
      color: "indigo",
      lastGenerated: "2024-12-07",
      type: "Cash Flow Analysis",
    },
    {
      id: "department_performance",
      title: "Department Performance Report",
      description: "Compare department spending efficiency and budget utilization",
      icon: Calculator,
      color: "orange",
      lastGenerated: "2024-12-08",
      type: "Performance Analysis",
    },
    {
      id: "monthly_trends",
      title: "Monthly Trends Report",
      description: "Month-over-month spending patterns and variance analysis",
      icon: Calendar,
      color: "teal",
      lastGenerated: "2024-12-08",
      type: "Trend Analysis",
    },
  ];

  // Mock quick stats
  const quickStats = {
    totalBudget: 2500000,
    actualSpending: 1875000,
    variance: 625000,
    utilizationRate: 75,
  };

  const getIconColor = (color: string) => {
    const colorMap = {
      blue: "text-blue-600 bg-blue-100",
      green: "text-green-600 bg-green-100", 
      purple: "text-purple-600 bg-purple-100",
      indigo: "text-indigo-600 bg-indigo-100",
      orange: "text-orange-600 bg-orange-100",
      teal: "text-teal-600 bg-teal-100",
    };
    return colorMap[color as keyof typeof colorMap] || "text-gray-600 bg-gray-100";
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Financial Reports"
        pageSubtitle="Generate and view comprehensive financial reports"
      >
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-gray-600 mt-1">
                Generate comprehensive financial reports and analytics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Custom Report
              </Button>
            </div>
          </div>

          {/* Quick Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budget</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(quickStats.totalBudget)}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Actual Spending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(quickStats.actualSpending)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calculator className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Budget Variance</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(quickStats.variance)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {quickStats.utilizationRate}%
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Period</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Actions</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableReports.map((report) => {
                  const IconComponent = report.icon;
                  const iconColorClass = getIconColor(report.color);

                  return (
                    <Card key={report.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className={`p-3 rounded-lg ${iconColorClass}`}>
                              <IconComponent className="h-6 w-6" />
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {report.type}
                            </span>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                            <p className="text-xs text-gray-500">
                              Last generated: {formatDate(report.lastGenerated)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    name: "Monthly Budget vs Actual - November 2024",
                    type: "Budget Variance",
                    generatedAt: "2024-12-01T09:30:00Z",
                    generatedBy: "John Doe",
                    size: "2.1 MB",
                  },
                  {
                    name: "Q4 2024 Expense Breakdown",
                    type: "Expense Analysis",
                    generatedAt: "2024-11-30T14:15:00Z",
                    generatedBy: "Jane Smith",
                    size: "1.8 MB",
                  },
                  {
                    name: "YTD P&L Statement 2024",
                    type: "Financial Statement",
                    generatedAt: "2024-11-28T16:45:00Z",
                    generatedBy: "Mike Johnson",
                    size: "3.2 MB",
                  },
                ].map((report, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{report.type}</span>
                          <span>Generated by {report.generatedBy}</span>
                          <span>{formatDate(report.generatedAt)}</span>
                          <span>{report.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedPage>
  );
}