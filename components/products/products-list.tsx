"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Package,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/use-products";
import type { Product, ProductStatus } from "@/types/products";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { formatCurrency } from "@/lib/formatters";
import { resolveUserBrandId } from "@/lib/brand-context";

const statusColors: Record<ProductStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  discontinued: "bg-red-100 text-red-800",
  out_of_stock: "bg-orange-100 text-orange-800",
};

const getStockLevelColor = (quantity: number, reorderLevel: number = 0): string => {
  if (quantity === 0) return "text-red-600 font-semibold";
  if (quantity <= reorderLevel) return "text-orange-600 font-semibold";
  return "text-green-600";
};

export function ProductsList() {
  const { profile, canPerformAction } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  const resolvedBrandId = resolveUserBrandId(profile, isSuperAdmin);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const {
    products,
    loading,
    error,
    totalCount,
    deleteProduct,
    refetch,
    page,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
  } = useProducts({
    searchTerm,
    filters,
    brandId: resolvedBrandId,
    isSuperAdmin,
  });

  const startItem = totalCount === 0 ? 0 : page * pageSize + 1;
  const endItem =
    totalCount === 0 ? 0 : Math.min(startItem + products.length - 1, totalCount);
  const pageSizeOptions = [25, 50, 100];

  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 80,
    overscan: 6,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (confirm(`Are you sure you want to delete "${productName}"?`)) {
      await deleteProduct(productId);
    }
  };

  const handleView = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading products: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between flex-none">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by SKU, name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!resolvedBrandId}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 flex flex-col">
            <div
              ref={tableContainerRef}
              className="flex-1 overflow-y-auto"
            >
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No products found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Get started by creating a new product.
                        </p>
                        <div className="mt-6">
                          <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td colSpan={7} style={{ height: `${paddingTop}px` }} />
                        </tr>
                      )}
                    {virtualRows.map((virtualRow) => {
                      const product = products[virtualRow.index];
                      return (
                        <tr
                          key={product.id}
                          data-index={virtualRow.index}
                          ref={(node) => rowVirtualizer.measureElement(node)}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleView(product.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                {product.product_image_url ? (
                                  <img
                                    src={product.product_image_url}
                                    alt={product.product_name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="ml-4">
                                <Link
                                  href={`/products/${product.id}`}
                                  className="text-sm font-medium text-teal-600 hover:text-teal-900"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {product.product_name}
                                </Link>
                                {product.description && (
                                  <div className="text-xs text-gray-500 truncate max-w-xs">
                                    {product.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/products/${product.id}`}
                              className="text-sm font-mono text-gray-900 hover:text-teal-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {product.sku}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.product_category || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(product.unit_price, product.currency)}
                            </div>
                            {product.cost_price && (
                              <div className="text-xs text-gray-500">
                                Cost: {formatCurrency(product.cost_price, product.currency)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`text-sm font-medium ${getStockLevelColor(
                                product.quantity_in_stock,
                                product.reorder_level
                              )}`}
                            >
                              {product.quantity_in_stock}
                            </div>
                            {product.reorder_level &&
                              product.quantity_in_stock <= product.reorder_level && (
                                <div className="text-xs text-orange-600">Low stock</div>
                              )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={statusColors[product.status]}>
                              {product.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleView(product.id);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(product);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(product.id, product.product_name);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td colSpan={7} style={{ height: `${paddingBottom}px` }} />
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {products.length > 0 && (
        <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between flex-none">
          <div>
            Showing {startItem}-{endItem} of {totalCount} products
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-500">
                Rows per page
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue placeholder={`${pageSize}`} />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <div className="text-xs font-medium text-gray-500">
                Page {pageCount === 0 ? 0 : page + 1} of{" "}
                {pageCount === 0 ? 0 : pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pageCount === 0 || page + 1 >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <ProductFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      {/* Edit Dialog */}
      <ProductFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        product={selectedProduct}
        onSuccess={() => {
          setShowEditDialog(false);
          setSelectedProduct(null);
          refetch();
        }}
      />
    </div>
  );
}



