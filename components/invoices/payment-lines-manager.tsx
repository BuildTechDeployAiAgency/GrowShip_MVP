"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Check,
  X,
  DollarSign,
  Calendar,
  FileText,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePaymentLines, usePaymentAttachments } from "@/hooks/use-payment-lines";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { PaymentLine, PaymentMethod } from "@/types/payment-lines";
import { Invoice } from "@/hooks/use-invoices";
import { cn } from "@/lib/utils";
import { AddPaymentLineDialog } from "./add-payment-line-dialog";
import { AttachmentsManager } from "./attachments-manager";

interface PaymentLinesManagerProps {
  invoice: Invoice;
  onPaymentUpdate?: () => void;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  credit: "Credit Card",
  check: "Check",
  wire_transfer: "Wire Transfer",
  other: "Other",
};

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function PaymentLinesManager({ invoice, onPaymentUpdate }: PaymentLinesManagerProps) {
  const { user } = useEnhancedAuth();
  const { paymentLines, loading, createPaymentLine, verifyPaymentLine, rejectPaymentLine, deletePaymentLine } = 
    usePaymentLines(invoice.id);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Calculate payment summary
  const totalPaid = paymentLines
    .filter(line => line.status === "verified")
    .reduce((sum, line) => sum + line.amount, 0);
  
  const pendingAmount = paymentLines
    .filter(line => line.status === "pending")
    .reduce((sum, line) => sum + line.amount, 0);
  
  const outstandingAmount = (invoice.total_amount || 0) - totalPaid;

  // Permission checks  
  const canAddPayment = Boolean(user?.profile?.role_name?.includes("admin") || user?.profile?.role_name?.includes("distributor"));
  const canVerifyPayments = Boolean(user?.profile?.role_name?.includes("admin") && !user?.profile?.role_name?.includes("distributor"));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Information
          </CardTitle>
          {canAddPayment && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Payment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-700">Total Paid</div>
            <div className="text-2xl font-bold text-green-900">
              ${totalPaid.toFixed(2)}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-700">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">
              ${pendingAmount.toFixed(2)}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-medium text-red-700">Outstanding</div>
            <div className="text-2xl font-bold text-red-900">
              ${outstandingAmount.toFixed(2)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Lines */}
        <div className="space-y-4">
          <h3 className="font-semibold">Payment Lines</h3>
          
          {paymentLines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No payments recorded yet</p>
              {canAddPayment && (
                <p className="text-sm">Click "Add Payment" to record a payment</p>
              )}
            </div>
          ) : (
            paymentLines.map((paymentLine) => (
              <PaymentLineCard
                key={paymentLine.id}
                paymentLine={paymentLine}
                invoice={invoice}
                canVerifyPayments={canVerifyPayments}
                isExpanded={expandedPaymentId === paymentLine.id}
                onToggleExpand={() => 
                  setExpandedPaymentId(
                    expandedPaymentId === paymentLine.id ? null : paymentLine.id
                  )
                }
                onVerify={() => verifyPaymentLine(invoice.id, paymentLine.id)}
                onReject={() => rejectPaymentLine(invoice.id, paymentLine.id)}
                onDelete={() => deletePaymentLine(invoice.id, paymentLine.id)}
              />
            ))
          )}
        </div>
      </CardContent>

      {/* Add Payment Dialog */}
      <AddPaymentLineDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        invoice={invoice}
        onSuccess={(newPayment) => {
          setIsAddDialogOpen(false);
          onPaymentUpdate?.();
        }}
      />
    </Card>
  );
}

interface PaymentLineCardProps {
  paymentLine: PaymentLine;
  invoice: Invoice;
  canVerifyPayments: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onVerify: () => void;
  onReject: () => void;
  onDelete: () => void;
}

function PaymentLineCard({
  paymentLine,
  invoice,
  canVerifyPayments,
  isExpanded,
  onToggleExpand,
  onVerify,
  onReject,
  onDelete,
}: PaymentLineCardProps) {
  const { user } = useEnhancedAuth();
  const statusInfo = statusConfig[paymentLine.status];
  const StatusIcon = statusInfo.icon;
  
  const canDelete = paymentLine.created_by === user?.id && paymentLine.status === "pending";
  
  const attachmentCount = Array.isArray(paymentLine.payment_attachments) 
    ? paymentLine.payment_attachments.length 
    : (paymentLine.payment_attachments as any)?.count || 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Payment Line Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">
            ${paymentLine.amount.toFixed(2)}
          </div>
          <Badge variant="outline" className={cn("border", statusInfo.className)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
          <span className="text-sm text-gray-500">
            via {paymentMethodLabels[paymentLine.payment_method]}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {attachmentCount > 0 && (
            <Badge variant="outline" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {attachmentCount} file{attachmentCount !== 1 ? 's' : ''}
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? "Show Less" : "Show More"}
          </Button>
        </div>
      </div>

      {/* Payment Line Details */}
      <div className="text-sm text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Payment Date: {format(new Date(paymentLine.payment_date), "MMM d, yyyy")}
        </div>
        {paymentLine.reference_number && (
          <div>Reference: {paymentLine.reference_number}</div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t">
          {paymentLine.notes && (
            <div>
              <div className="text-sm font-medium mb-1">Notes</div>
              <div className="text-sm text-gray-600">{paymentLine.notes}</div>
            </div>
          )}

          {/* Verification Info */}
          {paymentLine.status === "verified" && paymentLine.verified_at && (
            <div className="text-sm text-green-600">
              Verified on {format(new Date(paymentLine.verified_at), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}

          {/* Attachments */}
          <AttachmentsManager
            invoiceId={invoice.id}
            paymentLineId={paymentLine.id}
            canUpload={paymentLine.created_by === user?.id}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {canVerifyPayments && paymentLine.status === "pending" && (
              <>
                <Button
                  onClick={onVerify}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Verify
                </Button>
                <Button
                  onClick={onReject}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {canDelete && (
              <Button
                onClick={onDelete}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}