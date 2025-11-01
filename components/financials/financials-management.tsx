"use client";

import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useQuery } from "@tanstack/react-query";

interface FinancialMetric {
  label: string;
  value: string;
  change: number;
  trend: "up" | "down";
  icon: any;
  color: string;
}

const mockMetrics: FinancialMetric[] = [
  {
    label: "Total Revenue",
    value: "$125,450",
    change: 12.5,
    trend: "up",
    icon: DollarSign,
    color: "text-green-600",
  },
  {
    label: "Net Profit",
    value: "$45,230",
    change: 8.3,
    trend: "up",
    icon: TrendingUp,
    color: "text-green-600",
  },
  {
    label: "Total Expenses",
    value: "$80,220",
    change: -3.2,
    trend: "down",
    icon: TrendingDown,
    color: "text-red-600",
  },
  {
    label: "Accounts Receivable",
    value: "$32,500",
    change: 5.1,
    trend: "up",
    icon: ArrowUpRight,
    color: "text-blue-600",
  },
];

export function FinancialsManagement() {
  const { profile } = useEnhancedAuth();

  const { data: metrics = mockMetrics, isLoading } = useQuery({
    queryKey: ["financials", profile?.organization_id],
    queryFn: async () => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockMetrics;
    },
    enabled: !!profile?.organization_id,
  });

  return (
    <MainLayout
      pageTitle="Financials"
      pageSubtitle="Financial overview and analytics"
    >
      <div className="space-y-6">
        {/* Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center text-xs mt-1">
                    {metric.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={metric.trend === "up" ? "text-green-600" : "text-red-600"}>
                      {Math.abs(metric.change)}% from last period
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Financial Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-400">
                Chart placeholder - Revenue trends over time
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-400">
                Chart placeholder - Expense breakdown by category
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Statements */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Statements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Income Statement</h3>
                  <p className="text-sm text-gray-600">Q4 2024</p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Balance Sheet</h3>
                  <p className="text-sm text-gray-600">Q4 2024</p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Cash Flow Statement</h3>
                  <p className="text-sm text-gray-600">Q4 2024</p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}