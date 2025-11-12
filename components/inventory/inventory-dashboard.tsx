"use client";

import { useInventorySummary, useLowStockProducts, useUpcomingShipments } from "@/hooks/use-inventory";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Truck, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function InventoryDashboard() {
  const { profile } = useEnhancedAuth();
  const { summary, isLoading: summaryLoading } = useInventorySummary(profile?.brand_id);
  const { products: lowStockProducts, isLoading: lowStockLoading } = useLowStockProducts(profile?.brand_id);
  const { shipments, isLoading: shipmentsLoading } = useUpcomingShipments(profile?.brand_id, 30);

  if (summaryLoading || lowStockLoading || shipmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_products || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingDown className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.total_value?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary?.low_stock_count || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Products below reorder level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.out_of_stock_count || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Products with zero stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 10).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{product.product_name}</div>
                    <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={product.quantity_in_stock === 0 ? "destructive" : "outline"}
                    >
                      {product.quantity_in_stock === 0
                        ? "Out of Stock"
                        : `${product.quantity_in_stock} / ${product.reorder_level}`}
                    </Badge>
                    {product.days_until_out_of_stock && (
                      <div className="text-xs text-gray-500 mt-1">
                        ~{Math.ceil(product.days_until_out_of_stock)} days until out
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Shipments */}
      {shipments && shipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-teal-500" />
              Upcoming Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shipments.slice(0, 10).map((shipment) => (
                <div
                  key={shipment.po_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{shipment.po_number}</div>
                    <div className="text-sm text-gray-500">{shipment.supplier_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {format(new Date(shipment.expected_delivery_date), "MMM dd, yyyy")}
                    </div>
                    <div className="text-sm text-gray-500">
                      ${shipment.total_amount?.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


