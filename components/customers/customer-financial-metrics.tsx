"use client";

import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  useCustomerFinancials, 
  useRefreshCustomerFinancials,
  useFinancialFormatting 
} from "@/hooks/use-customer-financials";
import { CustomerFinancialMetricsProps } from "@/types/customer-financials";

export function CustomerFinancialMetrics({ 
  customerId, 
  customerName, 
  onDataUpdate 
}: CustomerFinancialMetricsProps) {
  const { financialMetrics, loading, error, refetch } = useCustomerFinancials(customerId);
  const { refreshFinancials, isRefreshing } = useRefreshCustomerFinancials();
  const { 
    formatCurrency, 
    formatPercentage, 
    formatDays, 
    getRiskLevel, 
    getRiskColor 
  } = useFinancialFormatting();

  const [showDetails, setShowDetails] = useState(false);

  const handleRefresh = async () => {
    try {
      await refreshFinancials(customerId);
      onDataUpdate?.(financialMetrics!);
    } catch (error) {
      console.error("Error refreshing financial data:", error);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export financial metrics for customer:", customerId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Metrics
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Metrics
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!financialMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No financial data available</p>
            <p className="text-sm">Financial metrics will appear once there are orders and invoices.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(financialMetrics.riskScore);
  const riskColorClass = getRiskColor(riskLevel);
  const netPosition = financialMetrics.totalOutstandingReceivables - financialMetrics.totalOutstandingPayables;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Metrics
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={riskColorClass}>
                Risk Level: {riskLevel.toUpperCase()}
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExport}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Outstanding Receivables */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Outstanding Receivables</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(financialMetrics.totalOutstandingReceivables)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {financialMetrics.receivablesAging.totalInvoices} outstanding invoices
                </p>
              </CardContent>
            </Card>

            {/* Outstanding Payables */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Outstanding Payables</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialMetrics.totalOutstandingPayables)}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Credits and refunds owed
                </p>
              </CardContent>
            </Card>

            {/* Days Sales Outstanding */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Days Sales Outstanding</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatDays(financialMetrics.currentDSO)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Average: {formatDays(financialMetrics.averageDSO)}
                </p>
              </CardContent>
            </Card>

            {/* Net Position */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Net Position</p>
                    <p className={`text-2xl font-bold ${netPosition >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(netPosition))}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {netPosition >= 0 ? 'Amount owed to us' : 'Amount we owe'}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Payment Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Payment Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Average Payment Time</p>
              <p className="text-lg font-semibold">
                {formatDays(financialMetrics.averagePaymentDays)}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (financialMetrics.averagePaymentDays / 60) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">On-Time Payment Rate</p>
              <p className="text-lg font-semibold">
                {formatPercentage(financialMetrics.onTimePaymentRate || 0)}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${financialMetrics.onTimePaymentRate || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Risk Score</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{financialMetrics.riskScore}/10</p>
                <Badge className={riskColorClass}>
                  {riskLevel.toUpperCase()}
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    riskLevel === 'low' ? 'bg-green-600' :
                    riskLevel === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${(financialMetrics.riskScore / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Additional Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {financialMetrics.totalInvoicesCount}
              </p>
              <p className="text-sm text-gray-500">Total Invoices</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {financialMetrics.totalOrdersCount}
              </p>
              <p className="text-sm text-gray-500">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(financialMetrics.lifetimeValue)}
              </p>
              <p className="text-sm text-gray-500">Lifetime Value</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {formatPercentage(financialMetrics.earlyPaymentRate || 0)}
              </p>
              <p className="text-sm text-gray-500">Early Payment Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receivables Aging Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Receivables Aging Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Current (0-30 days) */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-700">Current (0-30 days)</div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(financialMetrics.receivablesAging.current.amount)}
              </div>
              <div className="text-xs text-green-600">
                {financialMetrics.receivablesAging.current.invoiceCount} invoices
              </div>
              <div className="text-xs text-green-600">
                {formatPercentage(financialMetrics.receivablesAging.current.percentage)}
              </div>
            </div>

            {/* 31-60 days */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm font-medium text-yellow-700">31-60 days</div>
              <div className="text-xl font-bold text-yellow-900">
                {formatCurrency(financialMetrics.receivablesAging.days31to60.amount)}
              </div>
              <div className="text-xs text-yellow-600">
                {financialMetrics.receivablesAging.days31to60.invoiceCount} invoices
              </div>
              <div className="text-xs text-yellow-600">
                {formatPercentage(financialMetrics.receivablesAging.days31to60.percentage)}
              </div>
            </div>

            {/* 61-90 days */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-sm font-medium text-orange-700">61-90 days</div>
              <div className="text-xl font-bold text-orange-900">
                {formatCurrency(financialMetrics.receivablesAging.days61to90.amount)}
              </div>
              <div className="text-xs text-orange-600">
                {financialMetrics.receivablesAging.days61to90.invoiceCount} invoices
              </div>
              <div className="text-xs text-orange-600">
                {formatPercentage(financialMetrics.receivablesAging.days61to90.percentage)}
              </div>
            </div>

            {/* Over 90 days */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm font-medium text-red-700">Over 90 days</div>
              <div className="text-xl font-bold text-red-900">
                {formatCurrency(financialMetrics.receivablesAging.over90Days.amount)}
              </div>
              <div className="text-xs text-red-600">
                {financialMetrics.receivablesAging.over90Days.invoiceCount} invoices
              </div>
              <div className="text-xs text-red-600">
                {formatPercentage(financialMetrics.receivablesAging.over90Days.percentage)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {new Date(financialMetrics.lastCalculated).toLocaleString()}
      </div>
    </div>
  );
}