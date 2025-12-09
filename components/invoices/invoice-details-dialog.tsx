"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Invoice, PaymentStatus } from "@/hooks/use-invoices";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { FileText, Calendar, DollarSign, User, Mail, MapPin, CreditCard, Building } from "lucide-react";

interface InvoiceDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-orange-100 text-orange-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

export function InvoiceDetailsDialog({ open, onClose, invoice }: InvoiceDetailsDialogProps) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </DialogTitle>
          <DialogDescription>
            View all information about invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Created on {format(new Date(invoice.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <Badge className={paymentColors[invoice.payment_status]}>
                  {invoice.payment_status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Customer Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Customer Name</p>
                  <p className="text-base font-medium">{invoice.customer_name}</p>
                </div>
                {invoice.customer_email && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <p className="text-base">{invoice.customer_email}</p>
                    </div>
                  </div>
                )}
                {invoice.customer_address && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <div className="flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <p className="text-base">{invoice.customer_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Dates */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Invoice Dates</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Invoice Date</p>
                  <p className="text-base font-medium">
                    {format(new Date(invoice.invoice_date), "MMMM dd, yyyy")}
                  </p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Due Date</p>
                    <p className="text-base font-medium">
                      {format(new Date(invoice.due_date), "MMMM dd, yyyy")}
                    </p>
                  </div>
                )}
                {invoice.paid_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Paid Date</p>
                    <p className="text-base font-medium">
                      {format(new Date(invoice.paid_date), "MMMM dd, yyyy")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Financial Details</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Currency</p>
                    <p className="text-base font-medium">{invoice.currency || "USD"}</p>
                  </div>
                  {invoice.payment_method && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Payment Method</p>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <p className="text-base">{invoice.payment_method}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  {invoice.subtotal !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.discount_total !== undefined && invoice.discount_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(invoice.discount_total, invoice.currency)}
                      </span>
                    </div>
                  )}
                  {invoice.tax_total !== undefined && invoice.tax_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{formatCurrency(invoice.tax_total, invoice.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-primary">
                      {formatCurrency(invoice.total_amount || 0, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(invoice.notes || invoice.order_id) && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                <div className="space-y-3">
                  {invoice.order_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Related Order ID</p>
                      <p className="text-base font-medium">{invoice.order_id}</p>
                    </div>
                  )}
                  {invoice.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Notes</p>
                      <p className="text-base whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-semibold">System Information</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Invoice ID</p>
                  <p className="text-base font-mono text-sm">{invoice.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Brand ID</p>
                  <p className="text-base font-mono text-sm">{invoice.brand_id}</p>
                </div>
                {invoice.distributor_id && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Distributor ID</p>
                    <p className="text-base font-mono text-sm">{invoice.distributor_id}</p>
                  </div>
                )}
                {invoice.created_by && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created By</p>
                    <p className="text-base font-mono text-sm">{invoice.created_by}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="text-base">
                    {format(new Date(invoice.updated_at), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}