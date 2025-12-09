"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Download,
  Eye,
  AlertCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReceivablesAging, useFinancialFormatting } from "@/hooks/use-customer-financials";
import { ReceivablesAgingTableProps } from "@/types/customer-financials";

export function ReceivablesAgingTable({ 
  customerId, 
  onInvoiceClick, 
  filters 
}: ReceivablesAgingTableProps) {
  const [localFilters, setLocalFilters] = useState({
    agingBucket: "all",
    minimumAmount: undefined,
    sortBy: "daysOverdue",
    sortDirection: "desc" as "asc" | "desc",
    searchTerm: "",
  });

  const { receivablesData, loading, error, refetch } = useReceivablesAging(
    customerId,
    localFilters
  );

  const { 
    formatCurrency, 
    formatPercentage, 
    formatDays, 
    getAgingColor 
  } = useFinancialFormatting();

  const handleSortChange = (column: string) => {
    setLocalFilters(prev => ({
      ...prev,
      sortBy: column,
      sortDirection: prev.sortBy === column && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export receivables aging data");
  };

  const getStatusBadge = (paymentStatus: string, daysOverdue: number) => {
    if (paymentStatus === "paid") {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    if (daysOverdue > 0) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    }
    if (paymentStatus === "partially_paid") {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
  };

  const getAgingBucketColor = (bucket: string) => {
    switch (bucket) {
      case "current": return "text-green-600";
      case "days_31_60": return "text-yellow-600";
      case "days_61_90": return "text-orange-600";
      case "over_90": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getSortIcon = (column: string) => {
    if (localFilters.sortBy !== column) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return localFilters.sortDirection === "asc" 
      ? <ChevronUp className="h-4 w-4 text-gray-600" />
      : <ChevronDown className="h-4 w-4 text-gray-600" />;
  };

  // Filter receivables based on search term
  const filteredReceivables = receivablesData?.receivables?.filter((invoice: any) => {
    if (!localFilters.searchTerm) return true;
    const searchLower = localFilters.searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
      invoice.invoiceId.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Receivables Aging Detail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Receivables Aging Detail
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Receivables Aging Detail
          </CardTitle>
          <Button
            onClick={handleExport}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {receivablesData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-700">Total Outstanding</div>
              <div className="text-lg font-bold text-blue-900">
                {formatCurrency(receivablesData.summary.totalOutstanding)}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700">Total Invoices</div>
              <div className="text-lg font-bold text-gray-900">
                {receivablesData.summary.totalInvoices}
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm font-medium text-purple-700">Avg Invoice</div>
              <div className="text-lg font-bold text-purple-900">
                {formatCurrency(receivablesData.metadata?.averageInvoiceAmount || 0)}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="text-sm font-medium text-orange-700">Avg Days Overdue</div>
              <div className="text-lg font-bold text-orange-900">
                {Math.round(receivablesData.metadata?.averageDaysOverdue || 0)} days
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by invoice number..."
                value={localFilters.searchTerm}
                onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select
            value={localFilters.agingBucket}
            onValueChange={(value) => handleFilterChange("agingBucket", value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by aging" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="current">Current (0-30 days)</SelectItem>
              <SelectItem value="days_31_60">31-60 days</SelectItem>
              <SelectItem value="days_61_90">61-90 days</SelectItem>
              <SelectItem value="over_90">Over 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min amount"
            value={localFilters.minimumAmount || ""}
            onChange={(e) => handleFilterChange("minimumAmount", 
              e.target.value ? parseFloat(e.target.value) : undefined
            )}
            className="w-32"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortChange("invoiceNumber")}
                >
                  <div className="flex items-center gap-2">
                    Invoice Number
                    {getSortIcon("invoiceNumber")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortChange("invoiceDate")}
                >
                  <div className="flex items-center gap-2">
                    Invoice Date
                    {getSortIcon("invoiceDate")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortChange("dueDate")}
                >
                  <div className="flex items-center gap-2">
                    Due Date
                    {getSortIcon("dueDate")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 text-right"
                  onClick={() => handleSortChange("outstandingAmount")}
                >
                  <div className="flex items-center gap-2 justify-end">
                    Outstanding Amount
                    {getSortIcon("outstandingAmount")}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortChange("daysOverdue")}
                >
                  <div className="flex items-center gap-2">
                    Days Overdue
                    {getSortIcon("daysOverdue")}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aging Bucket</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceivables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No receivables found</p>
                    {localFilters.searchTerm || localFilters.agingBucket !== "all" ? (
                      <p className="text-sm">Try adjusting your filters</p>
                    ) : (
                      <p className="text-sm">All invoices are paid or there are no invoices yet</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceivables.map((invoice: any) => (
                  <TableRow key={invoice.invoiceId} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <button
                        onClick={() => onInvoiceClick?.(invoice.invoiceId)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </button>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate 
                        ? format(new Date(invoice.dueDate), "MMM d, yyyy")
                        : "No due date"
                      }
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.outstandingAmount)}
                    </TableCell>
                    <TableCell>
                      <span className={getAgingColor(invoice.daysOverdue)}>
                        {invoice.daysOverdue > 0 
                          ? `${invoice.daysOverdue} days`
                          : "Current"
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.paymentStatus, invoice.daysOverdue)}
                    </TableCell>
                    <TableCell>
                      <span className={getAgingBucketColor(invoice.agingBucket)}>
                        {invoice.agingBucket === "current" && "Current"}
                        {invoice.agingBucket === "days_31_60" && "31-60 days"}
                        {invoice.agingBucket === "days_61_90" && "61-90 days"}
                        {invoice.agingBucket === "over_90" && "90+ days"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onInvoiceClick?.(invoice.invoiceId)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Info */}
        <div className="text-xs text-gray-500 flex justify-between">
          <span>
            Showing {filteredReceivables.length} of {receivablesData?.receivables?.length || 0} receivables
          </span>
          <span>
            Last updated: {receivablesData?.metadata?.asOfDate 
              ? new Date(receivablesData.metadata.asOfDate).toLocaleString()
              : "Unknown"
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
}