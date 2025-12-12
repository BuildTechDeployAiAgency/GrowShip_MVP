"use client";

import { useState } from 'react';
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { useBudgets } from "@/hooks/use-financial-budgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Loader2
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BudgetStatus, PeriodType } from "@/types/financial";

export default function BudgetsPage() {
  const { user, profile, loading } = useRequireProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Build filters
  const filters = {
    brandId: profile?.brand_id,
    distributorId: profile?.distributor_id,
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
  };

  const { 
    data: budgetsData, 
    isLoading, 
    error,
    refetch,
    createBudget,
    isCreating 
  } = useBudgets({
    filters,
    page: currentPage,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const budgets = budgetsData?.data || [];
  const totalCount = budgetsData?.totalCount || 0;

  if (loading) {
    return (
      <MainLayout pageTitle="Budget Management" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'locked': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <TrendingUp className="h-4 w-4" />;
      case 'active': return <DollarSign className="h-4 w-4" />;
      case 'pending_approval': return <AlertTriangle className="h-4 w-4" />;
      case 'locked': return <Calendar className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Budget Management"
        pageSubtitle="Manage financial budgets and allocations"
      >
        <div className="space-y-6">
          {/* Page Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Budget Management</h1>
              <p className="text-gray-600 mt-1">
                Create, track, and manage budgets across departments and categories
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Budget
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search budgets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Period Type</label>
                  <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Periods</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Actions</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <Filter className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Budgets</p>
                    <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
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
                    <p className="text-sm font-medium text-gray-600">Active Budgets</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {budgets.filter(b => b.status === 'active').length}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Allocated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(budgets.reduce((sum, b) => sum + (b.allocatedAmount || 0), 0))}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {budgets.filter(b => b.status === 'pending_approval').length}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget List */}
          <Card>
            <CardHeader>
              <CardTitle>Budget List</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600">Error loading budgets: {error.message}</p>
                  <Button variant="outline" onClick={() => refetch()} className="mt-4">
                    Try Again
                  </Button>
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No budgets found</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Budget
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{budget.budgetName}</h3>
                            <Badge className={getStatusColor(budget.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(budget.status)}
                                {budget.status.replace('_', ' ')}
                              </div>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Period:</span> {budget.periodType} {budget.fiscalYear}
                            </div>
                            <div>
                              <span className="font-medium">Allocated:</span> {formatCurrency(budget.allocatedAmount)}
                            </div>
                            <div>
                              <span className="font-medium">Spent:</span> {formatCurrency(budget.spentAmount)}
                            </div>
                            <div>
                              <span className="font-medium">Remaining:</span> {formatCurrency(budget.remainingAmount)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">View Details</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedPage>
  );
}