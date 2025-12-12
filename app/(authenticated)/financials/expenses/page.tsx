"use client";

import { useState } from 'react';
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
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
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Loader2,
  DollarSign
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ExpenseStatus, ExpenseType } from "@/types/financial";

export default function ExpensesPage() {
  const { user, profile, loading } = useRequireProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ExpenseType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data for now - would be replaced with actual API call
  const mockExpenses = [
    {
      id: "1",
      expenseNumber: "EXP-2024-001234",
      description: "Office Supplies - Q4 2024",
      grossAmount: 2500.00,
      netAmount: 2500.00,
      currency: "USD",
      expenseDate: "2024-12-01",
      vendorName: "Office Depot",
      status: "pending_approval" as ExpenseStatus,
      expenseType: "supplies" as ExpenseType,
      department: "Administration",
      submittedBy: "John Doe",
      createdAt: "2024-12-01T10:30:00Z",
    },
    {
      id: "2", 
      expenseNumber: "EXP-2024-001235",
      description: "Marketing Campaign Materials",
      grossAmount: 15000.00,
      netAmount: 15000.00,
      currency: "USD",
      expenseDate: "2024-11-28",
      vendorName: "Print Solutions Inc",
      status: "approved" as ExpenseStatus,
      expenseType: "marketing" as ExpenseType,
      department: "Marketing",
      submittedBy: "Jane Smith",
      createdAt: "2024-11-28T14:15:00Z",
    },
    {
      id: "3",
      expenseNumber: "EXP-2024-001236", 
      description: "Cloud Infrastructure Costs",
      grossAmount: 8750.00,
      netAmount: 8750.00,
      currency: "USD",
      expenseDate: "2024-12-01",
      vendorName: "AWS",
      status: "paid" as ExpenseStatus,
      expenseType: "technology" as ExpenseType,
      department: "IT",
      submittedBy: "Mike Johnson",
      createdAt: "2024-12-01T09:00:00Z",
    },
  ];

  if (loading) {
    return (
      <MainLayout pageTitle="Expense Management" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800'; 
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ExpenseStatus) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Filter expenses based on current filters
  const filteredExpenses = mockExpenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesType = typeFilter === "all" || expense.expenseType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate summary stats
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.netAmount, 0);
  const pendingCount = filteredExpenses.filter(exp => exp.status === 'pending_approval').length;
  const approvedCount = filteredExpenses.filter(exp => exp.status === 'approved').length;
  const paidCount = filteredExpenses.filter(exp => exp.status === 'paid').length;

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Expense Management"
        pageSubtitle="Track and manage operational expenses"
      >
        <div className="space-y-6">
          {/* Page Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
              <p className="text-gray-600 mt-1">
                Submit, track, and approve operational expenses across departments
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </div>
          </div>

          {/* Expense Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Approved/Paid</p>
                    <p className="text-2xl font-bold text-gray-900">{approvedCount + paidCount}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                      placeholder="Search expenses..."
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
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Expense Type</label>
                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="warehousing">Warehousing</SelectItem>
                      <SelectItem value="personnel">Personnel</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="facilities">Facilities</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Actions</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setTypeFilter("all");
                      }}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense List */}
          <Card>
            <CardHeader>
              <CardTitle>Expense List</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No expenses found</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                              <p className="text-sm text-gray-500">{expense.expenseNumber}</p>
                            </div>
                            <Badge className={getStatusColor(expense.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(expense.status)}
                                {expense.status.replace('_', ' ')}
                              </div>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Amount:</span> {formatCurrency(expense.netAmount)}
                            </div>
                            <div>
                              <span className="font-medium">Date:</span> {formatDate(expense.expenseDate)}
                            </div>
                            <div>
                              <span className="font-medium">Vendor:</span> {expense.vendorName || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Department:</span> {expense.department || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Submitted by:</span> {expense.submittedBy}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {expense.status === 'pending_approval' && (
                            <>
                              <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                                Reject
                              </Button>
                            </>
                          )}
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