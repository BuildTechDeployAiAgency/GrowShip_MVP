"use client";

import { useState, useRef } from "react";
import { useInventoryProducts } from "@/hooks/use-inventory-products";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useInventoryFilter } from "@/contexts/inventory-filter-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  Package,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ProductWithInventory, StockStatusType } from "@/types/products";

// Stock status badge colors
const stockStatusColors: Record<string, string> = {
  out_of_stock: "bg-red-100 text-red-800 border-red-300",
  critical: "bg-red-100 text-red-700 border-red-300",
  low_stock: "bg-orange-100 text-orange-800 border-orange-300",
  in_stock: "bg-green-100 text-green-800 border-green-300",
  healthy: "bg-green-100 text-green-800 border-green-300",
};

// Stock status labels
const stockStatusLabels: Record<string, string> = {
  out_of_stock: "Out of Stock",
  critical: "Critical",
  low_stock: "Low Stock",
  in_stock: "In Stock",
  healthy: "Healthy",
};

// Format currency
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function InventoryProductsList() {
  const { profile } = useEnhancedAuth();
  const { viewProductTransactions } = useInventoryFilter();
  
  // Local filter state
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [sortBy, setSortBy] = useState("product_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  // Fetch products
  const { products, summary, pagination, isLoading, error, refetch } = useInventoryProducts(
    profile?.brand_id,
    {
      search: debouncedSearch,
      stockStatus: stockStatus as any,
      page,
      limit,
      sortBy,
      sortOrder,
    }
  );

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      [
        "SKU",
        "Product Name",
        "On Hand",
        "Allocated",
        "Available",
        "Inbound",
        "Unit Price",
        "Stock Value",
        "Low Threshold",
        "Critical Threshold",
        "Status",
      ].join(","),
      ...products.map((product) =>
        [
          product.sku,
          `"${product.product_name.replace(/"/g, '""')}"`,
          product.quantity_in_stock,
          product.allocated_stock || 0,
          product.available_stock || 0,
          product.inbound_stock || 0,
          product.unit_price,
          product.stock_value || 0,
          product.low_stock_threshold || 0,
          product.critical_stock_threshold || 0,
          product.stock_status || "unknown",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-products-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // View transactions for product
  const handleViewTransactions = (product: ProductWithInventory) => {
    viewProductTransactions(product.id, product.product_name, product.sku);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Error loading products: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold">{summary.total_products}</p>
              </div>
              <Package className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Stock</p>
                <p className="text-2xl font-bold text-green-700">{summary.in_stock_count}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low / Critical</p>
                <p className="text-2xl font-bold text-orange-700">
                  {summary.low_stock_count + summary.critical_count}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-700">{summary.out_of_stock_count}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Products Stock Levels</CardTitle>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500">
                Total Value: <span className="font-semibold text-gray-900">
                  {formatCurrency(summary.total_value)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by SKU or product name..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={stockStatus} onValueChange={(v) => { setStockStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport} disabled={products.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Products Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {debouncedSearch || stockStatus !== "all"
                  ? "Try adjusting your search or filters."
                  : "Add products to see their inventory levels here."}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("sku")}
                      >
                        <div className="flex items-center gap-1">
                          SKU
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("product_name")}
                      >
                        <div className="flex items-center gap-1">
                          Product Name
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("quantity_in_stock")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          On Hand
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("available_stock")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Available
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Inbound</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-center">Thresholds</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow 
                        key={product.id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate font-medium">{product.product_name}</div>
                          {product.product_category && (
                            <div className="text-xs text-gray-500">{product.product_category}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.quantity_in_stock}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {product.allocated_stock || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={
                            (product.available_stock || 0) <= 0 
                              ? "text-red-600 font-medium" 
                              : "text-green-600 font-medium"
                          }>
                            {product.available_stock || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {product.inbound_stock || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.stock_value || 0, product.currency || "USD")}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-xs text-gray-500">
                            <div>Low: {product.low_stock_threshold || 0}</div>
                            <div>Crit: {product.critical_stock_threshold || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline"
                            className={stockStatusColors[product.stock_status || "in_stock"]}
                          >
                            {stockStatusLabels[product.stock_status || "in_stock"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTransactions(product)}
                            title="View transaction history"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total} products
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {page} of {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.total_pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

