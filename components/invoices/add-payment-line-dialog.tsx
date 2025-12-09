"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Plus,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { usePaymentLines } from "@/hooks/use-payment-lines";
import { PaymentMethod, PaymentLine } from "@/types/payment-lines";
import { Invoice } from "@/hooks/use-invoices";

const paymentLineSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  payment_method: z.enum(["cash", "bank_transfer", "credit", "check", "wire_transfer", "other"] as const),
  payment_date: z.string().min(1, "Payment date is required"),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentLineFormData = z.infer<typeof paymentLineSchema>;

const paymentMethodOptions = [
  { value: "cash" as const, label: "Cash", icon: DollarSign },
  { value: "bank_transfer" as const, label: "Bank Transfer", icon: CreditCard },
  { value: "credit" as const, label: "Credit Card", icon: CreditCard },
  { value: "check" as const, label: "Check", icon: FileText },
  { value: "wire_transfer" as const, label: "Wire Transfer", icon: CreditCard },
  { value: "other" as const, label: "Other", icon: FileText },
];

interface AddPaymentLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onSuccess?: (paymentLine: PaymentLine) => void;
}

export function AddPaymentLineDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: AddPaymentLineDialogProps) {
  const { createPaymentLine } = usePaymentLines(invoice.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentLineFormData>({
    resolver: zodResolver(paymentLineSchema),
    defaultValues: {
      amount: "",
      payment_method: "bank_transfer",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      reference_number: "",
      notes: "",
    },
  });

  const outstandingAmount = (invoice.total_amount || 0) - 0; // You might want to calculate actual paid amount
  
  const onSubmit = async (data: PaymentLineFormData) => {
    try {
      setIsSubmitting(true);
      
      const paymentLineData = {
        amount: parseFloat(data.amount),
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
      };

      const newPaymentLine = await createPaymentLine(invoice.id, paymentLineData);
      
      form.reset();
      onSuccess?.(newPaymentLine);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating payment line:", error);
      // Error is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Payment Line
          </DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Invoice Total</div>
                  <div className="font-semibold">${(invoice.total_amount || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Outstanding</div>
                  <div className="font-semibold text-red-600">
                    ${outstandingAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Payment Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="payment_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Payment Date *
              </Label>
              <Input
                id="payment_date"
                type="date"
                {...form.register("payment_date")}
              />
              {form.formState.errors.payment_date && (
                <p className="text-sm text-red-600">{form.formState.errors.payment_date.message}</p>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method *
            </Label>
            <Select
              value={form.watch("payment_method")}
              onValueChange={(value: PaymentMethod) => 
                form.setValue("payment_method", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {form.formState.errors.payment_method && (
              <p className="text-sm text-red-600">
                {form.formState.errors.payment_method.message}
              </p>
            )}
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">
              Reference Number
              <span className="text-gray-500 text-sm ml-1">
                (Check #, Transaction ID, etc.)
              </span>
            </Label>
            <Input
              id="reference_number"
              placeholder="e.g., Check #1234, TX-789ABC"
              {...form.register("reference_number")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes
              <span className="text-gray-500 text-sm ml-1">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional payment details..."
              rows={3}
              {...form.register("notes")}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding Payment..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}