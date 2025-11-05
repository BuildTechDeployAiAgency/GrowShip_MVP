"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  Calendar,
  DollarSign,
  FileText,
  Truck,
  Edit,
  Printer,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Order, OrderStatus, PaymentStatus } from "@/hooks/use-orders";
import { Distributor } from "@/hooks/use-distributors";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { OrderFormDialog } from "./order-form-dialog";

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

interface OrderDetailsProps {
  orderId: string;
}

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch distributor if order has distributor_id
      if (orderData.distributor_id) {
        const { data: distributorData, error: distributorError } = await supabase
          .from("distributors")
          .select("*")
          .eq("id", orderData.distributor_id)
          .single();

        if (distributorError) {
          console.error("Error fetching distributor:", distributorError);
        } else {
          setDistributor(distributorData);
        }
      }
    } catch (err: any) {
      console.error("Error fetching order details:", err);
      setError(err.message || "Failed to load order details");
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    fetchOrderDetails(); // Refresh order data
    toast.success("Order updated successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">
            {error || "Order not found"}
          </p>
          <Button 
            onClick={() => router.push("/orders")} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/orders")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.order_number}
            </h1>
            <p className="text-sm text-gray-500">
              Order placed on {format(new Date(order.order_date), "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Order
          </Button>
        </div>
      </div>

      {/* Edit Order Dialog */}
      <OrderFormDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        order={order}
        onSuccess={handleEditSuccess}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={`mt-1 ${statusColors[order.order_status]}`}>
                    {order.order_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <Badge className={`mt-1 ${paymentColors[order.payment_status]}`}>
                    {order.payment_status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">
                    {format(new Date(order.order_date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">
                    {order.currency || "USD"} {order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Unit Price
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Discount
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.items.map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.sku}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.product_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              ${item.unit_price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">
                              {item.discount > 0 ? `-${item.discount}%` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-right">
                              ${item.total.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Separator />

                  {/* Order Totals */}
                  <div className="space-y-2 max-w-xs ml-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.discount_total && order.discount_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-red-600">
                          -${order.discount_total.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {order.tax_total && order.tax_total > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">${order.tax_total.toFixed(2)}</span>
                      </div>
                    )}
                    {order.shipping_cost && order.shipping_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">${order.shipping_cost.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total:</span>
                      <span className="text-teal-600">
                        {order.currency || "USD"} {order.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No items in this order</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Customer & Shipping */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              {order.customer_email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-sm">{order.customer_email}</p>
                </div>
              )}
              {order.customer_phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{order.customer_phone}</p>
                </div>
              )}
              {order.customer_type && (
                <div>
                  <p className="text-sm text-gray-500">Customer Type</p>
                  <Badge variant="outline" className="mt-1">
                    {order.customer_type}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distributor Information */}
          {distributor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Distributor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{distributor.name}</p>
                </div>
                {distributor.code && (
                  <div>
                    <p className="text-sm text-gray-500">Code</p>
                    <p className="font-medium">{distributor.code}</p>
                  </div>
                )}
                {distributor.contact_email && (
                  <div>
                    <p className="text-sm text-gray-500">Contact Email</p>
                    <p className="font-medium text-sm">{distributor.contact_email}</p>
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

          {/* Shipping Address */}
          {(order.shipping_address_line1 || distributor) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="not-italic text-sm space-y-1">
                  {order.shipping_address_line1 && (
                    <>
                      <p>{order.shipping_address_line1}</p>
                      {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                      <p>
                        {[order.shipping_city, order.shipping_state]
                          .filter(Boolean)
                          .join(", ")}
                        {order.shipping_zip_code && ` ${order.shipping_zip_code}`}
                      </p>
                      {order.shipping_country && <p>{order.shipping_country}</p>}
                    </>
                  )}
                  {!order.shipping_address_line1 && distributor && (
                    <>
                      {distributor.address_line1 && <p>{distributor.address_line1}</p>}
                      {distributor.address_line2 && <p>{distributor.address_line2}</p>}
                      <p>
                        {[distributor.city, distributor.state]
                          .filter(Boolean)
                          .join(", ")}
                        {distributor.postal_code && ` ${distributor.postal_code}`}
                      </p>
                      {distributor.country && <p>{distributor.country}</p>}
                    </>
                  )}
                </address>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {order.tags && order.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {order.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

