"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParsedOrder } from "@/types/import";
import { Distributor } from "@/hooks/use-distributors";
import { Building2, Package, AlertCircle } from "lucide-react";

interface DistributorConfirmationDialogProps {
  open: boolean;
  orders: ParsedOrder[];
  distributors: Distributor[];
  selectedDistributor?: string;
  isDistributorUser: boolean;
  distributorName?: string;
  onConfirm: (distributorId: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function DistributorConfirmationDialog({
  open,
  orders,
  distributors,
  selectedDistributor,
  isDistributorUser,
  distributorName,
  onConfirm,
  onCancel,
  loading = false,
}: DistributorConfirmationDialogProps) {
  const [distributorId, setDistributorId] = useState(selectedDistributor || "");

  const handleConfirm = () => {
    if (distributorId) {
      onConfirm(distributorId);
    }
  };

  const totalItems = orders.reduce((sum, order) => sum + order.items.length, 0);
  const uniqueCustomers = new Set(orders.map((o) => o.customer_name)).size;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Confirm Import Details</DialogTitle>
          <DialogDescription>
            Review the import summary and confirm the distributor assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Import Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Orders</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">Items</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{totalItems}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium text-purple-900">Customers</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{uniqueCustomers}</p>
            </div>
          </div>

          {/* Sample Orders Preview */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Sample Orders:</h4>
            <div className="max-h-32 overflow-y-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Items</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.slice(0, 5).map((order, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{order.order_date}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-900">{order.customer_name}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{order.items.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length > 5 && (
              <p className="text-xs text-gray-500 mt-1">
                Showing 5 of {orders.length} orders
              </p>
            )}
          </div>

          {/* Distributor Selection */}
          <div>
            <Label htmlFor="distributor" className="text-sm font-semibold text-gray-900 mb-2 block">
              Distributor Assignment
            </Label>
            
            {isDistributorUser ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-md">
                <Building2 className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{distributorName || "Your Distributor"}</p>
                  <p className="text-xs text-gray-500">Auto-assigned based on your role</p>
                </div>
              </div>
            ) : (
              <div>
                <Select
                  value={distributorId}
                  onValueChange={setDistributorId}
                  disabled={loading}
                >
                  <SelectTrigger id="distributor">
                    <SelectValue placeholder="Select a distributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{dist.name}</span>
                          {dist.code && (
                            <span className="text-xs text-gray-500">({dist.code})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {distributors.length === 0 && (
                  <div className="flex items-center gap-2 mt-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">No active distributors found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !distributorId}
          >
            {loading ? "Processing..." : "Confirm & Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

