"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInvoices, Invoice, PaymentStatus } from "@/hooks/use-invoices";
import { useDistributors } from "@/hooks/use-distributors";
import { useOrders } from "@/hooks/use-orders";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Link } from "lucide-react";

interface InvoiceFormDialogProps {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onSuccess?: () => void;
}

interface InvoiceFormData {
  // Order Linking (optional)
  order_id?: string;
  
  // Customer Info
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  
  // Distributor (optional)
  distributor_id?: string;
  
  // Brand
  brand_id: string;
  
  // Financial
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  currency: string;
  
  // Payment
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_date?: string;
  paid_date?: string;
  
  // Dates
  invoice_date: string;
  due_date?: string;
  
  // Notes
  notes?: string;
}

export function InvoiceFormDialog({
  open,
  onClose,
  invoice,
  onSuccess,
}: InvoiceFormDialogProps) {
  const { profile, canPerformAction, profileLoading } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  
  const { createInvoice, updateInvoice } = useInvoices({
    searchTerm: "",
    filters: {
      paymentStatus: "all",
      dateRange: "all",
    },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
  });

  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");
  const { distributors } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
    isSuperAdmin,
  });

  const { orders } = useOrders({
    searchTerm: "",
    filters: {
      status: "all",
      paymentStatus: "all",
      customerType: "all",
      dateRange: "all",
    },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
  });

  // Memoize today's date to prevent hydration issues
  const todayDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Calculate due date 30 days from invoice date
  const calculateDueDate = (invoiceDate: string): string => {
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_name: "",
    brand_id: "",
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    total_amount: 0,
    currency: "USD",
    payment_status: "pending",
    invoice_date: todayDate,
    due_date: calculateDueDate(todayDate),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkToOrder, setLinkToOrder] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && invoice) {
      // Editing existing invoice
      setFormData({
        order_id: invoice.order_id,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        customer_address: invoice.customer_address,
        distributor_id: invoice.distributor_id,
        brand_id: invoice.brand_id,
        subtotal: invoice.subtotal || 0,
        tax_total: invoice.tax_total || 0,
        discount_total: invoice.discount_total || 0,
        total_amount: invoice.total_amount || 0,
        currency: invoice.currency || "USD",
        payment_status: invoice.payment_status,
        payment_method: invoice.payment_method,
        payment_date: invoice.payment_date?.split("T")[0],
        paid_date: invoice.paid_date?.split("T")[0],
        invoice_date: invoice.invoice_date.split("T")[0],
        due_date: invoice.due_date?.split("T")[0],
        notes: invoice.notes,
      });
      setLinkToOrder(!!invoice.order_id);
    } else if (open && !profileLoading) {
      // Creating new invoice
      // For distributor_admin users, auto-populate their distributor_id
      const initialDate = todayDate;
      const initialDistributorId = isDistributorAdmin && profile?.distributor_id 
        ? profile.distributor_id 
        : undefined;
      
      setFormData({
        customer_name: "",
        brand_id: profile?.brand_id || "",
        distributor_id: initialDistributorId,
        subtotal: 0,
        tax_total: 0,
        discount_total: 0,
        total_amount: 0,
        currency: "USD",
        payment_status: "pending",
        invoice_date: initialDate,
        due_date: calculateDueDate(initialDate),
      });
      setLinkToOrder(false);
    }
  }, [open, invoice, profileLoading, profile?.brand_id, todayDate, isDistributorAdmin, profile?.distributor_id]);

  // Auto-populate from selected order
  useEffect(() => {
    if (formData.order_id && orders.length > 0) {
      const selectedOrder = orders.find((o) => o.id === formData.order_id);
      
      if (selectedOrder) {
        setFormData((prev) => ({
          ...prev,
          customer_name: selectedOrder.customer_name,
          customer_email: selectedOrder.customer_email,
          customer_phone: selectedOrder.customer_phone,
          distributor_id: selectedOrder.distributor_id,
          brand_id: selectedOrder.brand_id,
          subtotal: selectedOrder.subtotal,
          tax_total: selectedOrder.tax_total || 0,
          discount_total: selectedOrder.discount_total || 0,
          total_amount: selectedOrder.total_amount,
          currency: selectedOrder.currency || "USD",
        }));
      }
    }
  }, [formData.order_id, orders]);

  // Auto-populate from selected distributor
  useEffect(() => {
    if (formData.distributor_id && distributors.length > 0 && !formData.order_id) {
      const selectedDistributor = distributors.find(
        (d) => d.id === formData.distributor_id
      );
      
      if (selectedDistributor) {
        setFormData((prev) => ({
          ...prev,
          brand_id: selectedDistributor.brand_id,
          customer_name: selectedDistributor.name,
          customer_email: selectedDistributor.contact_email,
          customer_address: [
            selectedDistributor.address_line1,
            selectedDistributor.address_line2,
            selectedDistributor.city,
            selectedDistributor.state,
            selectedDistributor.postal_code,
            selectedDistributor.country,
          ]
            .filter(Boolean)
            .join(", "),
          currency: selectedDistributor.currency || "USD",
        }));
      }
    }
  }, [formData.distributor_id, distributors, formData.order_id]);

  // Auto-update due date when invoice date changes
  useEffect(() => {
    if (!invoice && formData.invoice_date) {
      setFormData((prev) => ({
        ...prev,
        due_date: calculateDueDate(formData.invoice_date),
      }));
    }
  }, [formData.invoice_date, invoice]);

  // Calculate total amount when components change
  useEffect(() => {
    const total = formData.subtotal - formData.discount_total + formData.tax_total;
    setFormData((prev) => ({
      ...prev,
      total_amount: Math.max(0, total),
    }));
  }, [formData.subtotal, formData.discount_total, formData.tax_total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customer_name.trim()) {
      toast.error("Please enter a customer name");
      return;
    }

    if (!formData.brand_id) {
      toast.error("Brand information is missing");
      return;
    }

    if (!formData.invoice_date) {
      toast.error("Please select an invoice date");
      return;
    }

    if (formData.total_amount <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }

    setIsSubmitting(true);

    try {
      const invoiceData: Partial<Invoice> = {
        order_id: linkToOrder ? formData.order_id : undefined,
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_address: formData.customer_address,
        distributor_id: formData.distributor_id,
        brand_id: formData.brand_id,
        subtotal: formData.subtotal,
        tax_total: formData.tax_total,
        discount_total: formData.discount_total,
        total_amount: formData.total_amount,
        currency: formData.currency,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date
          ? new Date(formData.payment_date).toISOString()
          : undefined,
        paid_date: formData.paid_date
          ? new Date(formData.paid_date).toISOString()
          : undefined,
        invoice_date: new Date(formData.invoice_date).toISOString(),
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : undefined,
        notes: formData.notes,
      };

      if (invoice) {
        await updateInvoice(invoice.id, invoiceData);
      } else {
        await createInvoice(invoiceData);
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting invoice:", error);
      toast.error(error?.message || "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? "Update invoice details below"
              : "Fill in the information to create a new invoice"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 pr-4 pb-8">
            {/* Order Linking Section */}
            {!invoice && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="linkToOrder"
                    checked={linkToOrder}
                    onChange={(e) => {
                      setLinkToOrder(e.target.checked);
                      if (!e.target.checked) {
                        setFormData((prev) => ({ ...prev, order_id: undefined }));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="linkToOrder" className="flex items-center gap-2 cursor-pointer">
                    <Link className="h-4 w-4" />
                    Link to existing order
                  </Label>
                </div>

                {linkToOrder && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="order_id">Select Order</Label>
                    <Select
                      value={formData.order_id || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          order_id: value === "none" ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select an order</SelectItem>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - {order.customer_name} (
                            {order.currency} {order.total_amount.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.order_id && (
                      <p className="text-xs text-blue-600">
                        Invoice details will be auto-populated from the selected order
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Customer Information */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5">
                Customer Information
              </h3>

              {/* Distributor Selection (optional) */}
              {!linkToOrder && (
                <div className="space-y-2">
                  <Label htmlFor="distributor_id">Distributor (Optional)</Label>
                  <Select
                    value={formData.distributor_id || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        distributor_id: value === "none" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No distributor</SelectItem>
                      {distributors.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id}>
                          {dist.name} {dist.code && `(${dist.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.distributor_id && (
                    <p className="text-xs text-muted-foreground">
                      Customer details will be auto-populated from distributor
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                    placeholder="Enter customer name"
                    required
                    disabled={!!formData.order_id || !!formData.distributor_id}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_email: e.target.value })
                    }
                    placeholder="customer@example.com"
                    disabled={!!formData.order_id || !!formData.distributor_id}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_address">Customer Address</Label>
                <Textarea
                  id="customer_address"
                  value={formData.customer_address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_address: e.target.value })
                  }
                  placeholder="Enter customer address"
                  rows={2}
                  className="resize-none"
                  disabled={!!formData.distributor_id}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5">
                Invoice Dates
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">
                    Invoice Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5">
                Financial Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal">
                    Subtotal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subtotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.subtotal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subtotal: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    required
                    disabled={!!formData.order_id}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    disabled={!!formData.order_id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_total">Discount</Label>
                  <Input
                    id="discount_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_total}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_total: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    disabled={!!formData.order_id}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_total">Tax</Label>
                  <Input
                    id="tax_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_total}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tax_total: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                    disabled={!!formData.order_id}
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formData.currency} {formData.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5">
                Payment Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select
                    value={formData.payment_status}
                    onValueChange={(value: PaymentStatus) =>
                      setFormData({ ...formData, payment_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Input
                    id="payment_method"
                    value={formData.payment_method || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_method: e.target.value })
                    }
                    placeholder="e.g., Credit Card, Bank Transfer"
                  />
                </div>
              </div>

              {(formData.payment_status === "paid" ||
                formData.payment_status === "partially_paid") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paid_date">Paid Date</Label>
                    <Input
                      id="paid_date"
                      type="date"
                      value={formData.paid_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, paid_date: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold border-b pb-1.5">
                Additional Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional notes about this invoice..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !formData.customer_name.trim() ||
              !formData.brand_id ||
              !formData.invoice_date ||
              formData.total_amount <= 0
            }
          >
            {isSubmitting
              ? "Saving..."
              : invoice
              ? "Update Invoice"
              : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

