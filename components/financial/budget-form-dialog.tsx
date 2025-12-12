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
import { useDistributors } from '@/hooks/use-distributors';
import { useProducts } from '@/hooks/use-products';
import { toast } from 'sonner';
import { Loader2, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreateBudgetRequest, PeriodType, CategoryType } from '@/types/financial';

const budgetSchema = z.object({
  budgetName: z.string().min(3, 'Budget name must be at least 3 characters'),
  allocationType: z.enum(['campaign', 'distributor']),
  targetId: z.string().min(1, 'Please select a target'),
  categoryType: z.string().min(1, 'Please select a category'),
  periodType: z.enum(['monthly', 'quarterly', 'annual']),
  periodStartDate: z.string().min(1, 'Start date is required'),
  periodEndDate: z.string().min(1, 'End date is required'),
  plannedAmount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().default('USD'),
  department: z.string().optional(),
  costCenter: z.string().optional(),
  budgetJustification: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BudgetFormDialog({ open, onClose, onSuccess }: BudgetFormDialogProps) {
  const { profile } = useEnhancedAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocationType, setAllocationType] = useState<'campaign' | 'distributor'>('campaign');
  
  const { data: distributors, isLoading: loadingDistributors } = useDistributors();
  const { products, loading: loadingProducts } = useProducts({
    searchTerm: '',
    filters: {},
    brandId: profile?.brand_id,
    pageSize: 100,
  });

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      budgetName: '',
      allocationType: 'campaign',
      targetId: '',
      categoryType: '',
      periodType: 'monthly',
      periodStartDate: new Date().toISOString().split('T')[0],
      periodEndDate: '',
      plannedAmount: 0,
      currency: 'USD',
      department: '',
      costCenter: '',
      budgetJustification: '',
      tags: [],
    },
  });

  const handlePeriodChange = (periodType: PeriodType) => {
    const startDate = new Date(form.getValues('periodStartDate'));
    let endDate = new Date(startDate);

    switch (periodType) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'annual':
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
    }

    form.setValue('periodEndDate', endDate.toISOString().split('T')[0]);
  };

  const onSubmit = async (values: BudgetFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create budget request based on allocation type
      const budgetData: CreateBudgetRequest = {
        budgetName: values.budgetName,
        brandId: profile?.brand_id || '',
        distributorId: allocationType === 'distributor' ? values.targetId : undefined,
        budgetCategoryId: values.categoryType, // This would need to be mapped to actual category ID
        fiscalYear: new Date(values.periodStartDate).getFullYear(),
        periodType: values.periodType,
        periodStartDate: values.periodStartDate,
        periodEndDate: values.periodEndDate,
        plannedAmount: values.plannedAmount,
        allocatedAmount: values.plannedAmount,
        currency: values.currency,
        department: values.department,
        costCenter: values.costCenter,
        budgetJustification: values.budgetJustification,
        tags: values.tags,
      };

      const response = await fetch('/api/financial/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      });

      if (!response.ok) {
        throw new Error('Failed to create budget');
      }

      toast.success('Budget created successfully');
      onSuccess?.();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>
            Set up a new budget allocation for campaigns or distributors
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget Name */}
            <div className="md:col-span-2">
              <Label htmlFor="budgetName">Budget Name</Label>
              <Input
                id="budgetName"
                placeholder="e.g., Q4 Marketing Campaign Budget"
                {...form.register('budgetName')}
                className="mt-1"
              />
              {form.formState.errors.budgetName && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.budgetName.message}</p>
              )}
            </div>

            {/* Allocation Type */}
            <div>
              <Label htmlFor="allocationType">Allocation Type</Label>
              <Select
                value={allocationType}
                onValueChange={(value: 'campaign' | 'distributor') => {
                  setAllocationType(value);
                  form.setValue('allocationType', value);
                  form.setValue('targetId', '');
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Selection */}
            <div>
              <Label htmlFor="targetId">
                {allocationType === 'campaign' ? 'Select Campaign' : 'Select Distributor'}
              </Label>
              <Select
                value={form.watch('targetId')}
                onValueChange={(value) => form.setValue('targetId', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={`Choose ${allocationType}`} />
                </SelectTrigger>
                <SelectContent>
                  {allocationType === 'distributor' ? (
                    loadingDistributors ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      distributors?.map((distributor) => (
                        <SelectItem key={distributor.id} value={distributor.id}>
                          {distributor.name}
                        </SelectItem>
                      ))
                    )
                  ) : (
                    <SelectItem value="campaign-1">Q4 Marketing Campaign</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.targetId && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.targetId.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="categoryType">Budget Category</Label>
              <Select
                value={form.watch('categoryType')}
                onValueChange={(value) => form.setValue('categoryType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                  <SelectItem value="warehousing">Warehousing</SelectItem>
                  <SelectItem value="personnel">Staff Costs</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.categoryType && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.categoryType.message}</p>
              )}
            </div>

            {/* Period Type */}
            <div>
              <Label htmlFor="periodType">Budget Period</Label>
              <Select
                value={form.watch('periodType')}
                onValueChange={(value: PeriodType) => {
                  form.setValue('periodType', value);
                  handlePeriodChange(value);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="periodStartDate">Start Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="periodStartDate"
                  type="date"
                  {...form.register('periodStartDate')}
                  className="pl-10"
                  onChange={(e) => {
                    form.setValue('periodStartDate', e.target.value);
                    handlePeriodChange(form.getValues('periodType'));
                  }}
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="periodEndDate">End Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="periodEndDate"
                  type="date"
                  {...form.register('periodEndDate')}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Budget Amount */}
            <div>
              <Label htmlFor="plannedAmount">Budget Amount</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="plannedAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register('plannedAmount', { valueAsNumber: true })}
                  className="pl-10"
                />
              </div>
              {form.formState.errors.plannedAmount && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.plannedAmount.message}</p>
              )}
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

            {/* Cost Center */}
            <div>
              <Label htmlFor="costCenter">Cost Center (Optional)</Label>
              <Input
                id="costCenter"
                placeholder="e.g., CC-001"
                {...form.register('costCenter')}
                className="mt-1"
              />
            </div>

            {/* Justification */}
            <div className="md:col-span-2">
              <Label htmlFor="budgetJustification">Budget Justification (Optional)</Label>
              <Textarea
                id="budgetJustification"
                placeholder="Provide justification for this budget allocation..."
                {...form.register('budgetJustification')}
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
                'Create Budget'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}