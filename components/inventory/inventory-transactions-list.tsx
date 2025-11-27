"use client";

import { useState, useEffect } from "react";
import { useInventoryTransactions } from "@/hooks/use-inventory-transactions";
import { useProductsDropdown } from "@/hooks/use-inventory-products";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useInventoryFilter } from "@/contexts/inventory-filter-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Edit, 
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Package,
  X
} from "lucide-react";
import Link from "next/link";
import { TransactionType, TransactionStatus, SourceType } from "@/types/inventory";

export function InventoryTransactionsList() {
  const { profile } = useEnhancedAuth();
  const { filters: contextFilters, clearProductSelection } = useInventoryFilter();
  
  // Fetch products for dropdown
  const { products: dropdownProducts, isLoading: productsLoading } = useProductsDropdown(
    profile?.brand_id
  );

  // Local filter state
  const [filters, setFilters] = useState({
    product_id: "all",
    sku: "",
    transaction_type: "all" as TransactionType | "all",
    source_type: "all" as SourceType | "all",
    status: "all" as TransactionStatus | "all",
    page: 1,
    limit: 50,
  });

  // Sync with context filters when product is selected from Products tab
  useEffect(() => {
    if (contextFilters.selectedProductId) {
      setFilters(prev => ({
        ...prev,
        product_id: contextFilters.selectedProductId || "all",
        sku: "", // Clear SKU search when product is selected from context
        page: 1,
      }));
    }
  }, [contextFilters.selectedProductId]);

  // Build query filters including context product filter
  const queryFilters = {
    ...filters,
    product_id: filters.product_id === "all" ? undefined : filters.product_id,
    sku: filters.sku || undefined,
    transaction_type: filters.transaction_type === "all" ? undefined : (filters.transaction_type as TransactionType),
    source_type: filters.source_type === "all" ? undefined : (filters.source_type as SourceType),
    status: filters.status === "all" ? undefined : (filters.status as TransactionStatus),
  };

  const { transactions, pagination, isLoading, error } = useInventoryTransactions(queryFilters);

  // Handle product selection change
  const handleProductChange = (value: string) => {
    // Clear context selection if user manually changes product
    if (contextFilters.selectedProductId && value !== contextFilters.selectedProductId) {
      clearProductSelection();
    }
    setFilters({ ...filters, product_id: value, page: 1 });
  };

  // Clear product filter
  const handleClearProduct = () => {
    clearProductSelection();
    setFilters({ ...filters, product_id: "all", page: 1 });
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    const colors = {
      PO_RECEIVED: "bg-green-100 text-green-800 border-green-300",
      PO_APPROVED: "bg-blue-100 text-blue-800 border-blue-300",
      PO_CANCELLED: "bg-gray-100 text-gray-800 border-gray-300",
      ORDER_ALLOCATED: "bg-yellow-100 text-yellow-800 border-yellow-300",
      ORDER_FULFILLED: "bg-purple-100 text-purple-800 border-purple-300",
      ORDER_CANCELLED: "bg-gray-100 text-gray-800 border-gray-300",
      MANUAL_ADJUSTMENT: "bg-orange-100 text-orange-800 border-orange-300",
      STOCKTAKE_ADJUSTMENT: "bg-indigo-100 text-indigo-800 border-indigo-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    const labels = {
      PO_RECEIVED: "PO Received",
      PO_APPROVED: "PO Approved",
      PO_CANCELLED: "PO Cancelled",
      ORDER_ALLOCATED: "Order Allocated",
      ORDER_FULFILLED: "Order Fulfilled",
      ORDER_CANCELLED: "Order Cancelled",
      MANUAL_ADJUSTMENT: "Manual Adjustment",
      STOCKTAKE_ADJUSTMENT: "Stocktake",
    };
    return labels[type] || type;
  };

  const getTransactionIcon = (quantityChange: number) => {
    if (quantityChange > 0) {
      return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    } else if (quantityChange < 0) {
      return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Edit className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants = {
      completed: <Badge variant="default" className="bg-green-500">Completed</Badge>,
      pending: <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>,
      cancelled: <Badge variant="outline" className="border-gray-500 text-gray-700">Cancelled</Badge>,
      reversed: <Badge variant="destructive">Reversed</Badge>,
    };
    return variants[status] || <Badge>{status}</Badge>;
  };

  const handleExport = () => {
    // Export to CSV functionality
    const csvContent = [
      ["Date", "SKU", "Product", "Type", "Quantity", "Stock Before", "Stock After", "Source", "Status"].join(","),
      ...(transactions || []).map(t => 
        [
          format(new Date(t.transaction_date), "yyyy-MM-dd HH:mm:ss"),
          t.sku,
          `"${(t.product_name || "N/A").replace(/"/g, '""')}"`,
          getTransactionTypeLabel(t.transaction_type),
          t.quantity_change,
          t.quantity_before,
          t.quantity_after,
          t.reference_number || "N/A",
          t.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get selected product info for display
  const selectedProduct = filters.product_id && filters.product_id !== "all"
    ? dropdownProducts.find((p: any) => p.id === filters.product_id)
    : null;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Error loading transactions: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Product Dropdown - New Filter */}
            <div className="relative">
              <Select
                value={filters.product_id}
                onValueChange={handleProductChange}
                disabled={productsLoading}
              >
                <SelectTrigger className={filters.product_id && filters.product_id !== "all" ? "pr-8" : ""}>
                  <div className="flex items-center gap-2 truncate">
                    <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <SelectValue placeholder="All Products" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Products</SelectItem>
                  {dropdownProducts.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      <span className="font-mono text-xs mr-2">{product.sku}</span>
                      <span className="truncate">{product.product_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.product_id && filters.product_id !== "all" && (
                <button
                  onClick={handleClearProduct}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* SKU Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by SKU..."
                value={filters.sku}
                onChange={(e) => setFilters({ ...filters, sku: e.target.value, page: 1 })}
                className="pl-10"
                disabled={!!filters.product_id && filters.product_id !== "all"}
              />
            </div>

            <Select
              value={filters.transaction_type}
              onValueChange={(value) => setFilters({ ...filters, transaction_type: value as TransactionType | "all", page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PO_RECEIVED">PO Received</SelectItem>
                <SelectItem value="PO_APPROVED">PO Approved</SelectItem>
                <SelectItem value="PO_CANCELLED">PO Cancelled</SelectItem>
                <SelectItem value="ORDER_ALLOCATED">Order Allocated</SelectItem>
                <SelectItem value="ORDER_FULFILLED">Order Fulfilled</SelectItem>
                <SelectItem value="ORDER_CANCELLED">Order Cancelled</SelectItem>
                <SelectItem value="MANUAL_ADJUSTMENT">Manual Adjustment</SelectItem>
                <SelectItem value="STOCKTAKE_ADJUSTMENT">Stocktake</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.source_type}
              onValueChange={(value) => setFilters({ ...filters, source_type: value as SourceType | "all", page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="order">Order</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="stocktake">Stocktake</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value as TransactionStatus | "all", page: 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!transactions || transactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
              <div className="text-sm text-teal-700">
                Showing transactions for: <span className="font-mono font-medium">{selectedProduct.sku}</span> - {selectedProduct.product_name}
              </div>
              <button
                onClick={handleClearProduct}
                className="text-teal-600 hover:text-teal-800 text-sm underline"
              >
                Clear filter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Transactions 
            {pagination && (
              <span className="text-sm text-gray-500 ml-2">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          {format(new Date(transaction.transaction_date), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono">
                          <Link
                            href={`/products/${transaction.product_id}`}
                            className="text-teal-600 hover:underline"
                          >
                            {transaction.sku}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transaction.product_name || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getTransactionTypeColor(transaction.transaction_type)}
                          >
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getTransactionIcon(transaction.quantity_change)}
                            <span className={transaction.quantity_change > 0 ? "text-green-600 font-medium" : transaction.quantity_change < 0 ? "text-red-600 font-medium" : ""}>
                              {transaction.quantity_change > 0 ? "+" : ""}{transaction.quantity_change}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {transaction.quantity_before}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.quantity_after}
                        </TableCell>
                        <TableCell>
                          {transaction.reference_number && transaction.source_type && (
                            <Link
                              href={`/${transaction.source_type === "purchase_order" ? "purchase-orders" : "orders"}/${transaction.source_id}`}
                              className="text-teal-600 hover:underline text-sm"
                            >
                              {transaction.reference_number}
                            </Link>
                          )}
                          {!transaction.reference_number && (
                            <span className="text-gray-500 text-sm">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(filters.page - 1) * filters.limit + 1} - {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                      disabled={filters.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {filters.page} of {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                      disabled={filters.page === pagination.total_pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {(filters.product_id && filters.product_id !== "all") || filters.sku || (filters.transaction_type && filters.transaction_type !== "all") || (filters.source_type && filters.source_type !== "all") || (filters.status && filters.status !== "all")
                  ? "Try adjusting your filters."
                  : "Inventory transactions will appear here when stock changes occur."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
