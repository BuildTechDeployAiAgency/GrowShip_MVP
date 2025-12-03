"use client";

import type { Product } from "@/types/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  DollarSign,
  Hash,
  Tag,
  Barcode,
  Weight,
  Calendar,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ProductDetailsContentProps {
  product: Product;
}

export function ProductDetailsContent({ product }: ProductDetailsContentProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStockStatusColor = (quantity: number, reorderLevel: number = 0): string => {
    if (quantity === 0) return "bg-red-100 text-red-800";
    if (quantity <= reorderLevel) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getStockStatusText = (quantity: number, reorderLevel: number = 0): string => {
    if (quantity === 0) return "Out of Stock";
    if (quantity <= reorderLevel) return "Low Stock";
    return "In Stock";
  };

  const profitMargin = product.cost_price && product.unit_price
    ? ((product.unit_price - product.cost_price) / product.unit_price * 100).toFixed(2)
    : null;

  return (
    <div className="space-y-6">
      {/* Product Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">SKU</span>
              <span className="text-sm font-medium font-mono">{product.sku}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Product Name</span>
              <span className="text-sm font-medium">{product.product_name}</span>
            </div>
            {product.barcode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Barcode</span>
                <span className="text-sm font-medium font-mono">{product.barcode}</span>
              </div>
            )}
            {product.product_category && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium">{product.product_category}</span>
              </div>
            )}
            {product.description && (
              <div className="pt-2 border-t">
                <span className="text-sm text-gray-500 block mb-2">Description</span>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Pricing & Margin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Unit Price</span>
              <span className="text-sm font-bold text-teal-600">
                {formatCurrency(product.unit_price, product.currency)}
              </span>
            </div>
            {product.cost_price && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Cost Price</span>
                <span className="text-sm font-medium">
                  {formatCurrency(product.cost_price, product.currency)}
                </span>
              </div>
            )}
            {profitMargin && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Profit Margin</span>
                <span className="text-sm font-medium text-green-600">
                  {profitMargin}%
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Currency</span>
              <span className="text-sm font-medium">{product.currency || "USD"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Stock Status</span>
              <Badge
                className={getStockStatusColor(
                  product.quantity_in_stock,
                  product.reorder_level
                )}
              >
                {getStockStatusText(product.quantity_in_stock, product.reorder_level)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Quantity in Stock</span>
              <span className="text-sm font-bold">{product.quantity_in_stock}</span>
            </div>
            {product.reorder_level !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reorder Level</span>
                <span className="text-sm font-medium">{product.reorder_level}</span>
              </div>
            )}
            {product.reorder_quantity !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reorder Quantity</span>
                <span className="text-sm font-medium">{product.reorder_quantity}</span>
              </div>
            )}
            {product.quantity_in_stock <= (product.reorder_level || 0) && product.reorder_quantity && (
              <div className="pt-2 border-t">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-800">
                    <strong>Reorder Alert:</strong> Stock is at or below reorder level. 
                    Consider ordering {product.reorder_quantity} units.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <Badge
                className={
                  product.status === "active"
                    ? "bg-green-100 text-green-800"
                    : product.status === "inactive"
                    ? "bg-gray-100 text-gray-800"
                    : product.status === "discontinued"
                    ? "bg-red-100 text-red-800"
                    : "bg-orange-100 text-orange-800"
                }
              >
                {product.status.replace("_", " ")}
              </Badge>
            </div>
            {product.weight && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Weight</span>
                <span className="text-sm font-medium">
                  {product.weight} {product.weight_unit || "kg"}
                </span>
              </div>
            )}
            {product.supplier_sku && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Supplier SKU</span>
                <span className="text-sm font-medium font-mono">{product.supplier_sku}</span>
              </div>
            )}
            {product.tags && product.tags.length > 0 && (
              <div className="pt-2 border-t">
                <span className="text-sm text-gray-500 block mb-2">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      {(product.notes || product.product_image_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.product_image_url && (
              <div>
                <span className="text-sm text-gray-500 block mb-2">Product Image</span>
                <img
                  src={product.product_image_url}
                  alt={product.product_name}
                  className="max-w-xs rounded-lg border"
                />
              </div>
            )}
            {product.notes && (
              <div>
                <span className="text-sm text-gray-500 block mb-2">Notes</span>
                <p className="text-sm text-gray-700">{product.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Record Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Created At</span>
            <span className="text-sm font-medium">{formatDate(product.created_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Last Updated</span>
            <span className="text-sm font-medium">{formatDate(product.updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

















