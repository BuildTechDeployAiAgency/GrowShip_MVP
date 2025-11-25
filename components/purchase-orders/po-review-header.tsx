"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Package, Calendar, DollarSign, FileText } from "lucide-react";
import type { PurchaseOrder } from "@/types/purchase-orders";

interface POReviewHeaderProps {
  po: PurchaseOrder;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-purple-100 text-purple-800",
  received: "bg-teal-100 text-teal-800",
  cancelled: "bg-red-100 text-red-800",
};

export function POReviewHeader({ po }: POReviewHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">PO Number</p>
              <p className="font-semibold text-lg">{po.po_number}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Supplier</p>
              <p className="font-medium">{po.supplier_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Expected Delivery</p>
              <p className="font-medium">
                {po.expected_delivery_date
                  ? format(new Date(po.expected_delivery_date), "MMM dd, yyyy")
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="font-semibold text-lg text-teal-600">
                {po.currency || "USD"} {po.total_amount?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-gray-500">Status: </span>
              <Badge className={statusColors[po.po_status] || "bg-gray-100 text-gray-800"}>
                {po.po_status}
              </Badge>
            </div>
            <div>
              <span className="text-sm text-gray-500">Currency: </span>
              <span className="font-medium">{po.currency || "USD"}</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Created: {format(new Date(po.created_at), "MMM dd, yyyy")}
          </div>
        </div>

        {po.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-1">Notes:</p>
            <p className="text-sm">{po.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

