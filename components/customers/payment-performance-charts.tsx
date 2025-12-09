"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCustomerFinancials, useFinancialFormatting } from "@/hooks/use-customer-financials";
import { PaymentPerformanceChartProps } from "@/types/customer-financials";

// Mock data for charts - in a real implementation, this would come from the API
const generateMockDSOTrend = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month, index) => ({
    month,
    dso: 35 + Math.random() * 20,
    averageDSO: 45,
    date: `2024-${(index + 1).toString().padStart(2, '0')}-01`,
  }));
};

const generateMockPaymentVelocity = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month) => ({
    month,
    onTime: 70 + Math.random() * 25,
    late: 15 + Math.random() * 10,
    early: 10 + Math.random() * 15,
  }));
};

const generateMockAgingTrend = () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month) => ({
    month,
    current: 60 + Math.random() * 20,
    days31to60: 20 + Math.random() * 10,
    days61to90: 10 + Math.random() * 5,
    over90: 5 + Math.random() * 5,
  }));
};

export function PaymentPerformanceCharts({ 
  customerId, 
  chartType, 
  timeframe 
}: PaymentPerformanceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"30d" | "90d" | "12m" | "24m">(timeframe);
  const [selectedChart, setSelectedChart] = useState<"dso" | "payment_velocity" | "aging_trend">(chartType);
  
  const { financialMetrics, loading } = useCustomerFinancials(customerId);
  const { formatCurrency, formatPercentage } = useFinancialFormatting();

  // Mock data - replace with actual API calls based on chartType and timeframe
  const dsoTrendData = generateMockDSOTrend();
  const paymentVelocityData = generateMockPaymentVelocity();
  const agingTrendData = generateMockAgingTrend();

  // Colors for charts
  const colors = {
    primary: "#3B82F6",
    secondary: "#10B981", 
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#8B5CF6",
  };

  const agingColors = ["#10B981", "#F59E0B", "#F97316", "#EF4444"];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Payment Performance Charts
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

  const DSOTrendChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dsoTrendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip 
          formatter={(value: number, name: string) => [
            `${Math.round(value)} days`,
            name === "dso" ? "Current DSO" : "Average DSO"
          ]}
        />
        <Line 
          type="monotone" 
          dataKey="dso" 
          stroke={colors.primary} 
          strokeWidth={3}
          dot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="averageDSO" 
          stroke={colors.secondary} 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const PaymentVelocityChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={paymentVelocityData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip 
          formatter={(value: number, name: string) => [
            `${Math.round(value)}%`,
            name === "onTime" ? "On Time" : 
            name === "late" ? "Late" : "Early"
          ]}
        />
        <Bar dataKey="onTime" fill={colors.secondary} />
        <Bar dataKey="late" fill={colors.danger} />
        <Bar dataKey="early" fill={colors.info} />
      </BarChart>
    </ResponsiveContainer>
  );

  const AgingTrendChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={agingTrendData} stackOffset="expand">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
        <Tooltip 
          formatter={(value: number, name: string) => {
            const percent = (value as number) * 100;
            const labels = {
              current: "Current (0-30 days)",
              days31to60: "31-60 days", 
              days61to90: "61-90 days",
              over90: "Over 90 days"
            };
            return [`${percent.toFixed(1)}%`, labels[name as keyof typeof labels]];
          }}
        />
        <Bar dataKey="current" stackId="aging" fill={agingColors[0]} />
        <Bar dataKey="days31to60" stackId="aging" fill={agingColors[1]} />
        <Bar dataKey="days61to90" stackId="aging" fill={agingColors[2]} />
        <Bar dataKey="over90" stackId="aging" fill={agingColors[3]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const CurrentAgingPieChart = () => {
    if (!financialMetrics) return null;
    
    const pieData = [
      { 
        name: "Current (0-30)", 
        value: financialMetrics.receivablesAging.current.amount,
        count: financialMetrics.receivablesAging.current.invoiceCount
      },
      { 
        name: "31-60 days", 
        value: financialMetrics.receivablesAging.days31to60.amount,
        count: financialMetrics.receivablesAging.days31to60.invoiceCount
      },
      { 
        name: "61-90 days", 
        value: financialMetrics.receivablesAging.days61to90.amount,
        count: financialMetrics.receivablesAging.days61to90.invoiceCount
      },
      { 
        name: "Over 90 days", 
        value: financialMetrics.receivablesAging.over90Days.amount,
        count: financialMetrics.receivablesAging.over90Days.invoiceCount
      },
    ].filter(item => item.value > 0);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={(props: any) => `${props.name}: ${(props.percent * 100).toFixed(1)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={agingColors[index % agingColors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Payment Performance Charts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeframe} onValueChange={(value) => setSelectedTimeframe(value as "30d" | "90d" | "12m" | "24m")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="12m">12 Months</SelectItem>
                <SelectItem value="24m">24 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedChart} onValueChange={(value) => setSelectedChart(value as "dso" | "payment_velocity" | "aging_trend")}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dso">DSO Trend</TabsTrigger>
            <TabsTrigger value="payment_velocity">Payment Velocity</TabsTrigger>
            <TabsTrigger value="aging_trend">Aging Trend</TabsTrigger>
            <TabsTrigger value="current_aging">Current Aging</TabsTrigger>
          </TabsList>

          <TabsContent value="dso" className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-100 text-blue-800">
                Current DSO: {Math.round(financialMetrics?.currentDSO || 0)} days
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                Average DSO: {Math.round(financialMetrics?.averageDSO || 0)} days
              </Badge>
            </div>
            <DSOTrendChart />
            <p className="text-sm text-gray-600">
              Days Sales Outstanding (DSO) measures how long it takes to collect receivables. 
              Lower DSO indicates faster collection.
            </p>
          </TabsContent>

          <TabsContent value="payment_velocity" className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">
                On Time: {formatPercentage(financialMetrics?.onTimePaymentRate || 0)}
              </Badge>
              <Badge className="bg-purple-100 text-purple-800">
                Early: {formatPercentage(financialMetrics?.earlyPaymentRate || 0)}
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                Late: {formatPercentage(financialMetrics?.latePaymentRate || 0)}
              </Badge>
            </div>
            <PaymentVelocityChart />
            <p className="text-sm text-gray-600">
              Payment velocity shows the percentage of invoices paid on time, early, or late by month.
            </p>
          </TabsContent>

          <TabsContent value="aging_trend" className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">Current</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">31-60 days</Badge>
              <Badge className="bg-orange-100 text-orange-800">61-90 days</Badge>
              <Badge className="bg-red-100 text-red-800">Over 90 days</Badge>
            </div>
            <AgingTrendChart />
            <p className="text-sm text-gray-600">
              Aging trend shows the distribution of receivables across aging buckets over time.
            </p>
          </TabsContent>

          <TabsContent value="current_aging" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(financialMetrics?.receivablesAging.current.amount || 0)}
                </div>
                <div className="text-sm text-gray-600">Current</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {formatCurrency(financialMetrics?.receivablesAging.days31to60.amount || 0)}
                </div>
                <div className="text-sm text-gray-600">31-60 days</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {formatCurrency(financialMetrics?.receivablesAging.days61to90.amount || 0)}
                </div>
                <div className="text-sm text-gray-600">61-90 days</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(financialMetrics?.receivablesAging.over90Days.amount || 0)}
                </div>
                <div className="text-sm text-gray-600">Over 90 days</div>
              </div>
            </div>
            <CurrentAgingPieChart />
            <p className="text-sm text-gray-600">
              Current aging breakdown shows the distribution of outstanding receivables by aging bucket.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}