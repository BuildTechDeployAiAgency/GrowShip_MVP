"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Lock,
  TruckIcon,
  CheckCircle,
  AlertTriangle,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { useProductTransactionHistory } from "@/hooks/use-inventory-transactions";
import { format } from "date-fns";
import Link from "next/link";

interface ProductInventoryBreakdownProps {
  productId: string;
  sku: string;
  quantityInStock: number;
  allocatedStock?: number;
  inboundStock?: number;
  availableStock?: number;
  reorderLevel?: number;
  lowStockThreshold?: number;
  criticalStockThreshold?: number;
}

export function ProductInventoryBreakdown({
  productId,
  sku,
  quantityInStock,
  allocatedStock = 0,
  inboundStock = 0,
  availableStock,
  reorderLevel,
  lowStockThreshold,
  criticalStockThreshold,
}: ProductInventoryBreakdownProps) {
  const { transactions, isLoading } = useProductTransactionHistory(productId, 5);

  // Calculate available stock if not provided
  const calculatedAvailableStock = availableStock !== undefined ? availableStock : quantityInStock - allocatedStock;

  const getStockHealthColor = () => {
    if (quantityInStock === 0) return "text-red-600";
    if (criticalStockThreshold && quantityInStock <= criticalStockThreshold) return "text-red-600";
    if (lowStockThreshold && quantityInStock <= lowStockThreshold) return "text-orange-600";
    return "text-green-600";
  };

  const getStockHealthBadge = () => {
    if (quantityInStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (criticalStockThreshold && quantityInStock <= criticalStockThreshold) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Critical</Badge>;
    }
    if (lowStockThreshold && quantityInStock <= lowStockThreshold) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Low Stock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-300">Healthy</Badge>;
  };

  const getTransactionIcon = (quantityChange: number) => {
    return quantityChange > 0 ? (
      <ArrowUpCircle className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PO_RECEIVED: "PO Received",
      PO_APPROVED: "PO Approved",
      ORDER_ALLOCATED: "Allocated",
      ORDER_FULFILLED: "Fulfilled",
      MANUAL_ADJUSTMENT: "Adjusted",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Stock Breakdown Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Inventory Breakdown
            </CardTitle>
            {getStockHealthBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* On-Hand Stock */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <div>
                  <div className="text-sm font-medium">On-Hand Stock</div>
                  <div className="text-xs text-gray-500">Physical inventory</div>
                </div>
              </div>
              <div className={`text-2xl font-bold ${getStockHealthColor()}`}>
                {quantityInStock}
              </div>
            </div>

            {/* Allocated Stock */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-sm font-medium">Allocated</div>
                  <div className="text-xs text-gray-500">Reserved for orders</div>
                </div>
              </div>
              <div className="text-xl font-bold text-yellow-600">
                {allocatedStock}
              </div>
            </div>

            {/* Available Stock */}
            <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                <div>
                  <div className="text-sm font-medium text-teal-900">Available</div>
                  <div className="text-xs text-teal-700">Ready to allocate</div>
                </div>
              </div>
              <div className="text-xl font-bold text-teal-600">
                {calculatedAvailableStock}
              </div>
            </div>

            {/* Inbound Stock */}
            {inboundStock > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Inbound</div>
                    <div className="text-xs text-blue-700">Expected from POs</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  +{inboundStock}
                </div>
              </div>
            )}

            {/* Low Stock Alert */}
            {lowStockThreshold && quantityInStock <= lowStockThreshold && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-orange-900">Low Stock Alert</div>
                  <div className="text-xs text-orange-700">
                    Current stock ({quantityInStock}) is below threshold ({lowStockThreshold})
                    {reorderLevel && `. Reorder level: ${reorderLevel}`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Low Stock Threshold</span>
              <span className="text-sm font-medium">
                {lowStockThreshold || "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Critical Threshold</span>
              <span className="text-sm font-medium">
                {criticalStockThreshold || "Not set"}
              </span>
            </div>
            {reorderLevel && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reorder Level</span>
                <span className="text-sm font-medium">{reorderLevel}</span>
              </div>
            )}
            <div className="pt-2 border-t">
              <Link href="/inventory/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Configure Thresholds
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Recent Transactions
            </CardTitle>
            <Link href={`/inventory/transactions?product_id=${productId}`}>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {getTransactionIcon(transaction.quantity_change)}
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(transaction.transaction_date), "MMM dd, yyyy HH:mm")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-medium ${
                        transaction.quantity_change > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.quantity_change > 0 ? "+" : ""}
                      {transaction.quantity_change}
                    </div>
                    <div className="text-xs text-gray-500">
                      {transaction.quantity_after} total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              No transactions yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

