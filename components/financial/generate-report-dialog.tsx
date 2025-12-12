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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import { useDistributors } from '@/hooks/use-distributors';
import { toast } from 'sonner';
import { Loader2, Calendar, FileText, Download, TrendingUp, DollarSign, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

const reportSchema = z.object({
  reportType: z.enum(['profit_loss', 'cash_flow', 'budget_vs_actual', 'expense_summary', 'budget_utilization']),
  periodType: z.enum(['monthly', 'quarterly', 'annual', 'custom']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  comparisonPeriod: z.boolean().default(false),
  format: z.enum(['pdf', 'excel', 'csv']),
  includeCharts: z.boolean().default(true),
  includeDetails: z.boolean().default(true),
  distributorId: z.string().optional(),
  department: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface GenerateReportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const reportTypeDetails = {
  profit_loss: {
    title: 'Profit & Loss Statement',
    description: 'Comprehensive P&L report showing revenue, expenses, and profitability',
    icon: TrendingUp,
  },
  cash_flow: {
    title: 'Cash Flow Statement',
    description: 'Track cash inflows and outflows over the selected period',
    icon: DollarSign,
  },
  budget_vs_actual: {
    title: 'Budget vs Actual Report',
    description: 'Compare budgeted amounts against actual expenses',
    icon: FileSpreadsheet,
  },
  expense_summary: {
    title: 'Expense Summary Report',
    description: 'Detailed breakdown of all expenses by category and vendor',
    icon: FileText,
  },
  budget_utilization: {
    title: 'Budget Utilization Report',
    description: 'Analysis of budget usage and remaining allocations',
    icon: TrendingUp,
  },
};

export function GenerateReportDialog({ open, onClose, onSuccess }: GenerateReportDialogProps) {
  const { profile } = useEnhancedAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<keyof typeof reportTypeDetails>('profit_loss');
  
  const { data: distributors } = useDistributors();

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: 'profit_loss',
      periodType: 'monthly',
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      comparisonPeriod: false,
      format: 'pdf',
      includeCharts: true,
      includeDetails: true,
      distributorId: '',
      department: '',
      categories: [],
    },
  });

  const handlePeriodChange = (periodType: string) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (periodType) {
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'annual':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
    }

    if (periodType !== 'custom') {
      form.setValue('startDate', startDate.toISOString().split('T')[0]);
      form.setValue('endDate', endDate.toISOString().split('T')[0]);
    }
  };

  const onSubmit = async (values: ReportFormValues) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/financial/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          brandId: profile?.brand_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const reportDetail = reportTypeDetails[values.reportType];
      a.download = `${reportDetail.title.replace(/\s+/g, '_')}_${values.startDate}_to_${values.endDate}.${values.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report generated successfully');
      onSuccess?.();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Financial Report</DialogTitle>
          <DialogDescription>
            Select report type and customize parameters to generate your financial report
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-4">
            <Label>Select Report Type</Label>
            <RadioGroup
              value={selectedReport}
              onValueChange={(value: keyof typeof reportTypeDetails) => {
                setSelectedReport(value);
                form.setValue('reportType', value);
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(reportTypeDetails).map(([key, details]) => {
                  const Icon = details.icon;
                  return (
                    <div key={key} className="relative">
                      <RadioGroupItem
                        value={key}
                        id={key}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={key}
                        className={cn(
                          "flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-teal-200",
                          "peer-checked:border-teal-500 peer-checked:bg-teal-50"
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="h-5 w-5 text-teal-600" />
                          <span className="font-medium">{details.title}</span>
                        </div>
                        <p className="text-sm text-gray-600">{details.description}</p>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period Type */}
            <div>
              <Label htmlFor="periodType">Report Period</Label>
              <Select
                value={form.watch('periodType')}
                onValueChange={(value) => {
                  form.setValue('periodType', value as any);
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
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Format */}
            <div>
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={form.watch('format')}
                onValueChange={(value) => form.setValue('format', value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="excel">Excel Workbook</SelectItem>
                  <SelectItem value="csv">CSV File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                  className="pl-10"
                  disabled={form.watch('periodType') !== 'custom'}
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="endDate"
                  type="date"
                  {...form.register('endDate')}
                  className="pl-10"
                  disabled={form.watch('periodType') !== 'custom'}
                />
              </div>
            </div>

            {/* Distributor Filter */}
            {profile?.role_name?.includes('brand') && (
              <div>
                <Label htmlFor="distributorId">Filter by Distributor (Optional)</Label>
                <Select
                  value={form.watch('distributorId')}
                  onValueChange={(value) => form.setValue('distributorId', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All distributors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All distributors</SelectItem>
                    {distributors?.map((distributor) => (
                      <SelectItem key={distributor.id} value={distributor.id}>
                        {distributor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Department Filter */}
            <div>
              <Label htmlFor="department">Filter by Department (Optional)</Label>
              <Input
                id="department"
                placeholder="e.g., Marketing"
                {...form.register('department')}
                className="mt-1"
              />
            </div>
          </div>

          {/* Report Options */}
          <div className="space-y-4">
            <Label>Report Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="comparisonPeriod"
                  checked={form.watch('comparisonPeriod')}
                  onCheckedChange={(checked) => form.setValue('comparisonPeriod', checked as boolean)}
                />
                <Label htmlFor="comparisonPeriod" className="text-sm font-normal">
                  Include comparison with previous period
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={form.watch('includeCharts')}
                  onCheckedChange={(checked) => form.setValue('includeCharts', checked as boolean)}
                />
                <Label htmlFor="includeCharts" className="text-sm font-normal">
                  Include charts and visualizations
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDetails"
                  checked={form.watch('includeDetails')}
                  onCheckedChange={(checked) => form.setValue('includeDetails', checked as boolean)}
                />
                <Label htmlFor="includeDetails" className="text-sm font-normal">
                  Include detailed transaction listings
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}