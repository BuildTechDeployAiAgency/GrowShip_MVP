"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  DollarSign, 
  PieChart, 
  Target, 
  TrendingUp,
  Building,
  HandCoins,
  Users,
  Banknote,
  Calculator,
  AlertCircle,
  Info
} from "lucide-react";
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, Tooltip, Legend, Pie } from "recharts";

// Fund source definitions with icons and descriptions
const FUND_SOURCES = [
  {
    value: 'brand_direct',
    label: 'Brand Direct',
    description: 'Direct funding from brand headquarters',
    icon: Building,
    color: '#3B82F6'
  },
  {
    value: 'mdf',
    label: 'Market Development Fund',
    description: 'MDF allocated for marketing activities',
    icon: Target,
    color: '#10B981'
  },
  {
    value: 'coop',
    label: 'Co-op Marketing',
    description: 'Cooperative marketing fund',
    icon: HandCoins,
    color: '#8B5CF6'
  },
  {
    value: 'distributor_self',
    label: 'Distributor Self-Funded',
    description: 'Distributor uses own funds',
    icon: Users,
    color: '#F59E0B'
  },
  {
    value: 'shared',
    label: 'Shared Investment',
    description: 'Combined brand and distributor funding',
    icon: Banknote,
    color: '#EF4444'
  },
];

const ALLOCATION_MODELS = [
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Distribute budget equally among selected distributors'
  },
  {
    value: 'performance',
    label: 'Performance-Based',
    description: 'Allocate based on historical performance'
  },
  {
    value: 'custom',
    label: 'Custom Allocation',
    description: 'Manually define budget allocation'
  },
  {
    value: 'territory',
    label: 'Territory-Based',
    description: 'Allocate based on territory size and potential'
  },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
];

export function CampaignBudgetStep() {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [allocationModel, setAllocationModel] = useState('equal');
  
  const selectedFundSource = watch('fundSource');
  const totalBudget = watch('totalBudget') || 0;
  const allocatedBudget = watch('allocatedBudget') || 0;
  const brandContribution = watch('brandContribution') || 0;
  const distributorContribution = watch('distributorContribution') || 0;
  const selectedDistributors = watch('distributorIds') || [];

  // Auto-calculate allocated budget when total budget changes
  useEffect(() => {
    if (totalBudget && !allocatedBudget) {
      setValue('allocatedBudget', totalBudget);
    }
  }, [totalBudget, allocatedBudget, setValue]);

  // Auto-split contributions based on fund source
  useEffect(() => {
    if (totalBudget && selectedFundSource) {
      switch (selectedFundSource) {
        case 'brand_direct':
          setValue('brandContribution', totalBudget);
          setValue('distributorContribution', 0);
          break;
        case 'distributor_self':
          setValue('brandContribution', 0);
          setValue('distributorContribution', totalBudget);
          break;
        case 'shared':
          const halfBudget = Math.round(totalBudget / 2);
          setValue('brandContribution', halfBudget);
          setValue('distributorContribution', totalBudget - halfBudget);
          break;
        case 'mdf':
        case 'coop':
          // Keep current values or set to total budget if brand funded
          if (brandContribution === 0 && distributorContribution === 0) {
            setValue('brandContribution', totalBudget);
            setValue('distributorContribution', 0);
          }
          break;
      }
    }
  }, [totalBudget, selectedFundSource, setValue, brandContribution, distributorContribution]);

  const handleContributionChange = (field: 'brand' | 'distributor', value: number) => {
    const otherValue = totalBudget - value;
    if (field === 'brand') {
      setValue('brandContribution', value);
      setValue('distributorContribution', Math.max(0, otherValue));
    } else {
      setValue('distributorContribution', value);
      setValue('brandContribution', Math.max(0, otherValue));
    }
  };

  // Calculate budget per distributor
  const budgetPerDistributor = selectedDistributors.length > 0 
    ? allocatedBudget / selectedDistributors.length 
    : 0;

  // Prepare data for pie chart
  const pieChartData = [
    { name: 'Brand Contribution', value: brandContribution, color: '#3B82F6' },
    { name: 'Distributor Contribution', value: distributorContribution, color: '#10B981' },
  ].filter(item => item.value > 0);

  const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === selectedCurrency)?.symbol || '$';

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Campaign Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Currency Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Budget */}
            <FormField
              control={control}
              name="totalBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Campaign Budget *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="pl-8"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 0 : Number(value));
                        }}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            e.target.value = '';
                            field.onChange(0);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Allocated Budget */}
            <FormField
              control={control}
              name="allocatedBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Budget *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        className="pl-8"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 0 : Number(value));
                        }}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            e.target.value = '';
                            field.onChange(0);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Amount to be allocated for this campaign period
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Budget Summary */}
          {totalBudget > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {currencySymbol}{totalBudget.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">Total Budget</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {currencySymbol}{allocatedBudget.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Allocated</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedDistributors.length}
                  </div>
                  <div className="text-sm text-purple-700">Distributors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {currencySymbol}{budgetPerDistributor.toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-700">Per Distributor</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fund Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Fund Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FUND_SOURCES.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-opacity-70 ${
                    selectedFundSource === source.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setValue('fundSource', source.value)}
                  style={{
                    borderColor: selectedFundSource === source.value ? source.color : undefined
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <Icon 
                      className="h-6 w-6 mt-1" 
                      style={{ color: source.color }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{source.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{source.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Budget Contribution Split */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Budget Contribution Split
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contribution Inputs */}
            <div className="space-y-4">
              <FormField
                control={control}
                name="brandContribution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Contribution</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          className="pl-8"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : Number(value);
                            handleContributionChange('brand', numValue);
                          }}
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.value = '';
                              handleContributionChange('brand', 0);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="distributorContribution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distributor Contribution</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          className="pl-8"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : Number(value);
                            handleContributionChange('distributor', numValue);
                          }}
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.value = '';
                              handleContributionChange('distributor', 0);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quick Split Buttons */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Split</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue('brandContribution', totalBudget);
                      setValue('distributorContribution', 0);
                    }}
                    disabled={!totalBudget}
                  >
                    100% Brand
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const half = Math.round(totalBudget / 2);
                      setValue('brandContribution', half);
                      setValue('distributorContribution', totalBudget - half);
                    }}
                    disabled={!totalBudget}
                  >
                    50/50 Split
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue('brandContribution', 0);
                      setValue('distributorContribution', totalBudget);
                    }}
                    disabled={!totalBudget}
                  >
                    100% Distributor
                  </Button>
                </div>
              </div>
            </div>

            {/* Pie Chart Visualization */}
            <div className="flex flex-col justify-center">
              {pieChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        dataKey="value"
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        labelLine={false}
                        label={(props: any) => 
                          `${currencySymbol}${props.value?.toLocaleString() || 0} (${((props.percent || 0) * 100).toFixed(1)}%)`
                        }
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${currencySymbol}${Number(value).toLocaleString()}`, '']}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Enter budget amounts to see contribution breakdown</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validation Warning */}
          {(brandContribution + distributorContribution) !== totalBudget && totalBudget > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Warning: Total contributions ({currencySymbol}{(brandContribution + distributorContribution).toLocaleString()}) 
                don't match total budget ({currencySymbol}{totalBudget.toLocaleString()})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Allocation Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Budget Allocation Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALLOCATION_MODELS.map((model) => (
                <div
                  key={model.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    allocationModel === model.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setAllocationModel(model.value)}
                >
                  <h3 className="font-medium text-gray-900">{model.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                </div>
              ))}
            </div>

            {/* Allocation Preview */}
            {selectedDistributors.length > 0 && allocatedBudget > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-purple-600" />
                  <h4 className="font-medium text-purple-900">
                    Budget Allocation Preview ({allocationModel} model)
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedDistributors.map((distributorId: string, index: number) => (
                    <div key={distributorId} className="flex justify-between items-center bg-white rounded px-3 py-2">
                      <span className="text-sm text-gray-700">Distributor {index + 1}</span>
                      <Badge variant="secondary">
                        {currencySymbol}{budgetPerDistributor.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}