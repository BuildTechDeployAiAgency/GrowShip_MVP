"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import { toast } from 'sonner';
import { Loader2, Calendar, DollarSign, Upload, FileText, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreateExpenseRequest, ExpenseType, PaymentMethod } from '@/types/financial';

const expenseSchema = z.object({
  description: z.string().min(3, 'Description must be at least 3 characters'),
  expenseType: z.string().min(1, 'Please select an expense type'),
  expenseSubcategory: z.string().optional(),
  grossAmount: z.number().min(0.01, 'Amount must be greater than 0'),
  taxAmount: z.number().min(0, 'Tax amount must be positive'),
  currency: z.string().default('USD'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  dueDate: z.string().optional(),
  vendorName: z.string().min(1, 'Vendor name is required'),
  vendorContact: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  paymentMethod: z.string().optional(),
  department: z.string().optional(),
  costCenter: z.string().optional(),
  internalNotes: z.string().optional(),
  receiptFile: z.any().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const expenseCategories: Record<ExpenseType, string[]> = {
  logistics: ['Shipping', 'Freight', 'Last Mile Delivery', 'Customs & Duties', 'Packaging'],
  warehousing: ['Storage', 'Handling', 'Inventory Management', 'Equipment Rental', 'Security'],
  marketing: ['Advertising', 'Trade Shows', 'Promotions', 'Digital Marketing', 'Content Creation'],
  personnel: ['Salaries', 'Benefits', 'Training', 'Recruitment', 'Travel & Entertainment'],
  technology: ['Software Licenses', 'Hardware', 'Cloud Services', 'Maintenance', 'Development'],
  facilities: ['Rent', 'Utilities', 'Maintenance', 'Office Supplies', 'Security'],
  professional_services: ['Consulting', 'Legal', 'Accounting', 'Audit', 'Other Services'],
  travel: ['Airfare', 'Hotels', 'Ground Transportation', 'Meals', 'Conferences'],
  training: ['Courses', 'Certifications', 'Workshops', 'Materials', 'External Training'],
  utilities: ['Electricity', 'Water', 'Internet', 'Phone', 'Other Utilities'],
  insurance: ['Business Insurance', 'Health Insurance', 'Property Insurance', 'Liability', 'Other'],
  equipment: ['Machinery', 'Tools', 'Computers', 'Furniture', 'Vehicles'],
  supplies: ['Office Supplies', 'Raw Materials', 'Consumables', 'Safety Equipment', 'Other'],
  maintenance: ['Building Maintenance', 'Equipment Maintenance', 'Vehicle Maintenance', 'IT Maintenance'],
  other: ['Miscellaneous', 'One-time Expenses', 'Other'],
};

export function ExpenseFormDialog({ open, onClose, onSuccess }: ExpenseFormDialogProps) {
  const { profile } = useEnhancedAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<ExpenseType | ''>('');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      expenseType: '',
      expenseSubcategory: '',
      grossAmount: 0,
      taxAmount: 0,
      currency: 'USD',
      expenseDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      vendorName: '',
      vendorContact: '',
      invoiceNumber: '',
      purchaseOrderNumber: '',
      paymentMethod: '',
      department: '',
      costCenter: '',
      internalNotes: '',
    },
  });

  const calculateNetAmount = () => {
    const gross = form.watch('grossAmount') || 0;
    const tax = form.watch('taxAmount') || 0;
    return gross + tax;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('receiptFile', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Create expense request
      const expenseData: CreateExpenseRequest = {
        description: values.description,
        brandId: profile?.brand_id || '',
        distributorId: profile?.distributor_id,
        budgetCategoryId: values.expenseType, // This would need to be mapped
        expenseType: values.expenseType as ExpenseType,
        grossAmount: values.grossAmount,
        currency: values.currency,
        expenseDate: values.expenseDate,
        vendorName: values.vendorName,
        invoiceNumber: values.invoiceNumber,
        department: values.department,
        notes: values.internalNotes,
      };

      // Add expense data to form data
      Object.entries(expenseData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Add additional fields
      if (values.taxAmount) formData.append('taxAmount', String(values.taxAmount));
      if (values.dueDate) formData.append('dueDate', values.dueDate);
      if (values.vendorContact) formData.append('vendorContact', values.vendorContact);
      if (values.purchaseOrderNumber) formData.append('purchaseOrderNumber', values.purchaseOrderNumber);
      if (values.paymentMethod) formData.append('paymentMethod', values.paymentMethod);
      if (values.costCenter) formData.append('costCenter', values.costCenter);
      if (values.expenseSubcategory) formData.append('expenseSubcategory', values.expenseSubcategory);
      
      // Add receipt file if provided
      if (values.receiptFile) {
        formData.append('receipt', values.receiptFile);
      }

      const response = await fetch('/api/financial/expenses', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create expense');
      }

      toast.success('Expense created successfully');
      onSuccess?.();
      onClose();
      form.reset();
      setReceiptPreview(null);
      setSelectedType('');
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new expense with all necessary details for tracking and approval
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Expense Description</Label>
              <Input
                id="description"
                placeholder="e.g., Office supplies for Q4"
                {...form.register('description')}
                className="mt-1"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Expense Type */}
            <div>
              <Label htmlFor="expenseType">Expense Category</Label>
              <Select
                value={selectedType}
                onValueChange={(value: ExpenseType) => {
                  setSelectedType(value);
                  form.setValue('expenseType', value);
                  form.setValue('expenseSubcategory', '');
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="warehousing">Warehousing</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="personnel">Staff Costs</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="facilities">Facilities</SelectItem>
                  <SelectItem value="professional_services">Professional Services</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.expenseType && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.expenseType.message}</p>
              )}
            </div>

            {/* Subcategory */}
            {selectedType && (
              <div>
                <Label htmlFor="expenseSubcategory">Subcategory</Label>
                <Select
                  value={form.watch('expenseSubcategory')}
                  onValueChange={(value) => form.setValue('expenseSubcategory', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories[selectedType]?.map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Vendor Name */}
            <div>
              <Label htmlFor="vendorName">Vendor/Supplier Name</Label>
              <Input
                id="vendorName"
                placeholder="e.g., ABC Supplies Inc."
                {...form.register('vendorName')}
                className="mt-1"
              />
              {form.formState.errors.vendorName && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.vendorName.message}</p>
              )}
            </div>

            {/* Vendor Contact */}
            <div>
              <Label htmlFor="vendorContact">Vendor Contact (Optional)</Label>
              <Input
                id="vendorContact"
                placeholder="Email or phone"
                {...form.register('vendorContact')}
                className="mt-1"
              />
            </div>

            {/* Expense Date */}
            <div>
              <Label htmlFor="expenseDate">Expense Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="expenseDate"
                  type="date"
                  {...form.register('expenseDate')}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="dueDate"
                  type="date"
                  {...form.register('dueDate')}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Gross Amount */}
            <div>
              <Label htmlFor="grossAmount">Amount (Before Tax)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="grossAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('grossAmount', { valueAsNumber: true })}
                  className="pl-10"
                />
              </div>
              {form.formState.errors.grossAmount && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.grossAmount.message}</p>
              )}
            </div>

            {/* Tax Amount */}
            <div>
              <Label htmlFor="taxAmount">Tax Amount</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('taxAmount', { valueAsNumber: true })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Total Amount Display */}
            <div className="md:col-span-2">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-teal-600">
                    ${calculateNetAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Number */}
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
              <Input
                id="invoiceNumber"
                placeholder="e.g., INV-12345"
                {...form.register('invoiceNumber')}
                className="mt-1"
              />
            </div>

            {/* PO Number */}
            <div>
              <Label htmlFor="purchaseOrderNumber">PO Number (Optional)</Label>
              <Input
                id="purchaseOrderNumber"
                placeholder="e.g., PO-67890"
                {...form.register('purchaseOrderNumber')}
                className="mt-1"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={form.watch('paymentMethod')}
                onValueChange={(value) => form.setValue('paymentMethod', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div>
              <Label htmlFor="department">Department (Optional)</Label>
              <Input
                id="department"
                placeholder="e.g., Marketing"
                {...form.register('department')}
                className="mt-1"
              />
            </div>

            {/* Receipt Upload */}
            <div className="md:col-span-2">
              <Label htmlFor="receipt">Receipt/Invoice Upload</Label>
              <div className="mt-1">
                <label
                  htmlFor="receiptFile"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50",
                    receiptPreview ? "border-teal-500 bg-teal-50" : "border-gray-300"
                  )}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {receiptPreview ? (
                      <>
                        <FileText className="h-8 w-8 text-teal-500 mb-2" />
                        <p className="text-sm text-gray-700">Receipt uploaded</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </div>
                  <input
                    id="receiptFile"
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="internalNotes">Internal Notes (Optional)</Label>
              <Textarea
                id="internalNotes"
                placeholder="Any additional notes or context..."
                {...form.register('internalNotes')}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Expense'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}