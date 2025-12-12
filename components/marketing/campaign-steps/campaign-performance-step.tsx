"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Target, 
  TrendingUp, 
  Eye, 
  Users, 
  UserPlus,
  DollarSign,
  Percent,
  BarChart3,
  Zap,
  Award,
  AlertCircle,
  Info
} from "lucide-react";

// Performance metric definitions with industry benchmarks
const PERFORMANCE_METRICS = [
  {
    key: 'targetRoiPercentage',
    label: 'Target ROI',
    icon: TrendingUp,
    unit: '%',
    description: 'Expected return on investment percentage',
    benchmark: { min: 15, max: 50, suggested: 25 },
    color: '#10B981'
  },
  {
    key: 'targetSalesAmount',
    label: 'Target Sales Revenue',
    icon: DollarSign,
    unit: '$',
    description: 'Expected sales revenue from campaign',
    benchmark: null,
    color: '#3B82F6'
  },
  {
    key: 'targetReach',
    label: 'Target Reach',
    icon: Users,
    unit: 'people',
    description: 'Number of unique people to reach',
    benchmark: { min: 1000, max: 100000, suggested: 10000 },
    color: '#8B5CF6'
  },
  {
    key: 'targetImpressions',
    label: 'Target Impressions',
    icon: Eye,
    unit: 'impressions',
    description: 'Total number of ad impressions',
    benchmark: { min: 5000, max: 500000, suggested: 50000 },
    color: '#F59E0B'
  },
  {
    key: 'targetLeads',
    label: 'Target Leads',
    icon: UserPlus,
    unit: 'leads',
    description: 'Expected number of qualified leads',
    benchmark: { min: 50, max: 5000, suggested: 500 },
    color: '#EF4444'
  },
];

// Performance goal templates based on campaign type
const PERFORMANCE_TEMPLATES = [
  {
    name: 'Brand Awareness',
    description: 'Focus on reach and impressions',
    icon: Target,
    metrics: {
      targetRoiPercentage: 20,
      targetReach: 25000,
      targetImpressions: 150000,
      targetLeads: 200,
    }
  },
  {
    name: 'Lead Generation',
    description: 'Optimize for lead acquisition',
    icon: UserPlus,
    metrics: {
      targetRoiPercentage: 30,
      targetReach: 15000,
      targetImpressions: 75000,
      targetLeads: 800,
    }
  },
  {
    name: 'Sales Growth',
    description: 'Drive direct sales revenue',
    icon: TrendingUp,
    metrics: {
      targetRoiPercentage: 40,
      targetReach: 10000,
      targetImpressions: 50000,
      targetLeads: 300,
    }
  },
  {
    name: 'Product Launch',
    description: 'Maximize awareness and trial',
    icon: Zap,
    metrics: {
      targetRoiPercentage: 25,
      targetReach: 30000,
      targetImpressions: 200000,
      targetLeads: 500,
    }
  },
];

export function CampaignPerformanceStep() {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const campaignType = watch('campaignType');
  const totalBudget = watch('totalBudget') || 0;
  const currentMetrics = {
    targetRoiPercentage: watch('targetRoiPercentage') || 0,
    targetSalesAmount: watch('targetSalesAmount') || 0,
    targetReach: watch('targetReach') || 0,
    targetImpressions: watch('targetImpressions') || 0,
    targetLeads: watch('targetLeads') || 0,
  };

  const applyTemplate = (template: any) => {
    setSelectedTemplate(template.name);
    Object.entries(template.metrics).forEach(([key, value]) => {
      setValue(key, value);
    });
    
    // Auto-calculate target sales based on ROI and budget
    if (totalBudget && template.metrics.targetRoiPercentage) {
      const targetSales = totalBudget * (1 + template.metrics.targetRoiPercentage / 100);
      setValue('targetSalesAmount', Math.round(targetSales));
    }
  };

  const calculateProjectedSales = () => {
    if (totalBudget && currentMetrics.targetRoiPercentage) {
      return totalBudget * (1 + currentMetrics.targetRoiPercentage / 100);
    }
    return 0;
  };

  const getMetricStatus = (metric: any, value: number) => {
    if (!metric.benchmark || value === 0) return 'neutral';
    
    if (value < metric.benchmark.min) return 'low';
    if (value > metric.benchmark.max) return 'high';
    if (value >= metric.benchmark.suggested * 0.8 && value <= metric.benchmark.suggested * 1.2) return 'optimal';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'optimal': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Goal Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PERFORMANCE_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.name}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-opacity-70 ${
                    selectedTemplate === template.name
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-6 w-6 text-green-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          ROI: {template.metrics.targetRoiPercentage}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Reach: {template.metrics.targetReach.toLocaleString()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Leads: {template.metrics.targetLeads.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Targets & KPIs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {PERFORMANCE_METRICS.map((metric) => {
            const Icon = metric.icon;
            const currentValue = currentMetrics[metric.key as keyof typeof currentMetrics];
            const status = getMetricStatus(metric, currentValue);
            const statusColor = getStatusColor(status);

            return (
              <div key={metric.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: metric.color }} />
                    <Label className="font-medium">{metric.label}</Label>
                    {metric.benchmark && (
                      <Badge variant="outline" className={`text-xs ${statusColor}`}>
                        {status}
                      </Badge>
                    )}
                  </div>
                  {currentValue > 0 && (
                    <span className="text-sm font-medium" style={{ color: metric.color }}>
                      {metric.unit === '$' ? '$' : ''}{currentValue.toLocaleString()}{metric.unit !== '$' ? metric.unit : ''}
                    </span>
                  )}
                </div>

                <FormField
                  control={control}
                  name={metric.key}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          {metric.unit === '$' && (
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              $
                            </span>
                          )}
                          <Input
                            type="number"
                            placeholder={`Enter target ${metric.label.toLowerCase()}`}
                            className={metric.unit === '$' ? 'pl-8' : ''}
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
                          {metric.unit === '%' && (
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              %
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        {metric.description}
                        {metric.benchmark && (
                          <span className="ml-2 text-gray-500">
                            (Suggested: {metric.unit === '$' ? '$' : ''}{metric.benchmark.suggested.toLocaleString()}{metric.unit !== '$' ? metric.unit : ''})
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Benchmark Slider */}
                {metric.benchmark && currentValue > 0 && (
                  <div className="px-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Low ({metric.benchmark.min.toLocaleString()})</span>
                      <span>Optimal ({metric.benchmark.suggested.toLocaleString()})</span>
                      <span>High ({metric.benchmark.max.toLocaleString()})</span>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full">
                      <div 
                        className="absolute h-full rounded-full"
                        style={{ 
                          width: `${Math.min((currentValue / metric.benchmark.max) * 100, 100)}%`,
                          backgroundColor: metric.color 
                        }}
                      />
                      {/* Optimal range indicator */}
                      <div 
                        className="absolute h-full bg-green-300 bg-opacity-50 rounded-full"
                        style={{ 
                          left: `${(metric.benchmark.suggested * 0.8 / metric.benchmark.max) * 100}%`,
                          width: `${((metric.benchmark.suggested * 0.4) / metric.benchmark.max) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Performance Projections */}
      {totalBudget > 0 && currentMetrics.targetRoiPercentage > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Projected Revenue</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  ${calculateProjectedSales().toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">
                  Based on {currentMetrics.targetRoiPercentage}% ROI
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Cost Per Lead</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {currentMetrics.targetLeads > 0 ? 
                    `$${Math.round(totalBudget / currentMetrics.targetLeads)}` : 
                    '$0'
                  }
                </div>
                <div className="text-sm text-green-700">
                  Budget ÷ Target Leads
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Cost Per Impression</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {currentMetrics.targetImpressions > 0 ? 
                    `$${(totalBudget / currentMetrics.targetImpressions).toFixed(3)}` : 
                    '$0.000'
                  }
                </div>
                <div className="text-sm text-purple-700">
                  Budget ÷ Target Impressions
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="mt-4 space-y-2">
              {currentMetrics.targetRoiPercentage > 0 && currentMetrics.targetRoiPercentage < 15 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    ROI target below 15% may indicate conservative expectations. Consider increasing targets for better performance measurement.
                  </span>
                </div>
              )}
              
              {currentMetrics.targetLeads > 0 && totalBudget / currentMetrics.targetLeads > 100 && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    High cost per lead (${Math.round(totalBudget / currentMetrics.targetLeads)}). Consider increasing lead targets or optimizing budget allocation.
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}