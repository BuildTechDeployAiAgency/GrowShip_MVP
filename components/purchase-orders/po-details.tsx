"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Package, 
  User, 
  Calendar,
  DollarSign,
  FileText,
  ShoppingCart,
  Edit,
  Printer,
  Download,
  Plus,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { PurchaseOrder, POStatus, PaymentStatus } from "@/types/purchase-orders";
import { Distributor } from "@/hooks/use-distributors";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { POFormDialog } from "./po-form-dialog";
import { POHistoryTimeline } from "./po-history-timeline";
import { POApprovalDialog } from "./po-approval-dialog";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { formatCurrency } from "@/lib/formatters";

const statusColors: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  ordered: "bg-purple-100 text-purple-800",
  received: "bg-teal-100 text-teal-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

interface PODetailsProps {
  poId: string;
}

interface RelatedOrder {
  id: string;
  order_number: string;
  order_date: string;
  order_status: string;
  total_amount: number;
  currency: string;
}

export function PODetails({ poId }: PODetailsProps) {
  const router = useRouter();
  const { profile } = useEnhancedAuth();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showCreateOrderPrompt, setShowCreateOrderPrompt] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Only Super Admin and Brand Admin can approve POs
  const canApprovePO = profile?.role_name === "super_admin" || profile?.role_name === "brand_admin";
  
  // Only Super Admin and Brand Admin can create orders from POs
  const canCreateOrder = profile?.role_name === "super_admin" || profile?.role_name === "brand_admin";

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch PO
      const { data: poData, error: poError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;
      setPO(poData);

      // Fetch distributor if PO has distributor_id
      if (poData.distributor_id) {
        const { data: distributorData, error: distributorError } = await supabase
          .from("distributors")
          .select("*")
          .eq("id", poData.distributor_id)
          .single();

        if (distributorError) {
          console.error("Error fetching distributor:", distributorError);
        } else {
          setDistributor(distributorData);
        }
      }

      // Fetch related orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, order_date, order_status, total_amount, currency")
        .eq("purchase_order_id", poId)
        .order("order_date", { ascending: false });

      if (ordersError) {
        console.error("Error fetching related orders:", ordersError);
      } else {
        setRelatedOrders(ordersData || []);
      }
    } catch (err: any) {
      console.error("Error fetching PO details:", err);
      setError(err.message || "Failed to load purchase order details");
      toast.error("Failed to load purchase order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (poId) {
      fetchPODetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  const handleCreateOrder = async () => {
    if (!po) return;

    // Check if PO is in approved or ordered status
    if (po.po_status !== "approved" && po.po_status !== "ordered") {
      toast.error(`Cannot create order from ${po.po_status} purchase order. PO must be approved.`);
      return;
    }

    setCreatingOrder(true);
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order");
      }

      toast.success("Order created successfully from purchase order!");
      
      // Refresh to show new related order
      fetchPODetails();

      // Navigate to the new order
      if (result.order?.id) {
        router.push(`/orders/${result.order.id}`);
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "Failed to create order from purchase order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.info("Download functionality coming soon");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error || "Purchase order not found"}</p>
          <Button onClick={() => router.push("/purchase-orders")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchase Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  const calculateTotals = () => {
    if (!po) return { subtotal: 0, total: 0, tax: 0, shipping: 0 };
    
    let subtotal = po.subtotal || 0;
    // If subtotal is 0 but we have items with value, calculate it
    if (subtotal === 0 && po.items && po.items.length > 0) {
      subtotal = po.items.reduce((sum: number, item: any) => {
        const quantity = item.quantity || 0;
        const price = item.unit_price || item.price || 0;
        return sum + (quantity * price);
      }, 0);
    }
    
    const tax = po.tax_total || 0;
    const shipping = po.shipping_cost || 0;
    // If total is 0 but we have calculated subtotal, use that
    const total = (po.total_amount && po.total_amount > 0) ? po.total_amount : (subtotal + tax + shipping);
    
    return { subtotal, tax, shipping, total };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchase-orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{po.po_number}</h1>
            <p className="text-sm text-gray-500">
              {format(new Date(po.po_date), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit PO
          </Button>
          {canApprovePO && po.po_status === "submitted" && (
            <Button 
              size="sm" 
              onClick={() => setShowApprovalDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Purchase Order
            </Button>
          )}
          {canCreateOrder && (po.po_status === "approved" || po.po_status === "ordered") && (
            <Button 
              size="sm" 
              onClick={handleCreateOrder}
              disabled={creatingOrder}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {creatingOrder ? "Creating..." : "Create Order"}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">PO Status</p>
              <Badge className={statusColors[po.po_status]}>
                {po.po_status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <Badge className={paymentColors[po.payment_status]}>
                {po.payment_status.replace("_", " ")}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">PO Date</p>
              <p className="font-medium">
                {format(new Date(po.po_date), "MMM dd, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="font-medium text-teal-600">
                {formatCurrency(totals.total, po.currency)}
              </p>
            </div>
          </div>

          {po.expected_delivery_date && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Expected Delivery</p>
              <p className="font-medium">
                {format(new Date(po.expected_delivery_date), "MMM dd, yyyy")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Items */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {po.items && po.items.length > 0 ? (
                    po.items.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">{item.sku}</td>
                        <td className="px-4 py-3 text-sm">{item.product_name || item.name}</td>
                        <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {formatCurrency(item.unit_price || item.price, po.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(item.total || (item.quantity * (item.unit_price || item.price || 0)), po.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(totals.subtotal, po.currency)}</span>
              </div>
              {(totals.tax > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(totals.tax, po.currency)}</span>
                </div>
              )}
              {(totals.shipping > 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">{formatCurrency(totals.shipping, po.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-teal-600">Total:</span>
                <span className="text-teal-600">{formatCurrency(totals.total, po.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchaser Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Purchaser Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              {/* Prioritize distributor name over supplier_name to avoid showing "Your Distributor Account" */}
              <p className="font-medium">{distributor?.name || po.supplier_name || "N/A"}</p>
            </div>
            {(distributor?.contact_email || po.supplier_email) && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{distributor?.contact_email || po.supplier_email}</p>
              </div>
            )}
            {(distributor?.contact_phone || po.supplier_phone) && (
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{distributor?.contact_phone || po.supplier_phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distributor Information */}
        {distributor && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Distributor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Distributor Name</p>
                <p className="font-medium">{distributor.name}</p>
              </div>
              {distributor.contact_email && (
                <div>
                  <p className="text-sm text-gray-500">Contact Email</p>
                  <p className="font-medium">{distributor.contact_email}</p>
                </div>
              )}
              {distributor.contact_phone && (
                <div>
                  <p className="text-sm text-gray-500">Contact Phone</p>
                  <p className="font-medium">{distributor.contact_phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Related Orders */}
      {relatedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Related Orders ({relatedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <div>
                    <p className="font-medium text-teal-600">{order.order_number}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(order.order_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(order.total_amount, order.currency)}
                    </p>
                    <Badge className="mt-1">{order.order_status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {po.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{po.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <POHistoryTimeline poId={poId} />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <POFormDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        po={po}
        onSuccess={() => {
          setShowEditDialog(false);
          fetchPODetails();
        }}
      />

      {/* Approval Dialog */}
      <POApprovalDialog
        open={showApprovalDialog}
        onClose={() => setShowApprovalDialog(false)}
        po={po}
        action="approve"
        onSuccess={() => {
          setShowApprovalDialog(false);
          fetchPODetails();
          setShowCreateOrderPrompt(true);
        }}
      />

      {/* Create Order Confirmation Dialog */}
      <Dialog open={showCreateOrderPrompt} onOpenChange={setShowCreateOrderPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Related Order?</DialogTitle>
            <DialogDescription>
              The purchase order has been approved. Would you like to create a new sales order from this purchase order now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOrderPrompt(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => {
              setShowCreateOrderPrompt(false);
              handleCreateOrder();
            }}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

