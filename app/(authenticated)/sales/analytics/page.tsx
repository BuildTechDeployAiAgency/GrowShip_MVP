"use client";

import dynamic from "next/dynamic";
import { MainLayout } from "@/components/layout/main-layout";
import {
  DateFilterProvider,
  useDateFilters,
} from "@/contexts/date-filter-context";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { GlobalDateFilter } from "@/components/sales/global-date-filter";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy chart components for better performance
const SalesMetricsCards = dynamic(
  () => import("@/components/sales/sales-metrics-cards").then(mod => ({ default: mod.SalesMetricsCards })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const RevenueComparisonChart = dynamic(
  () => import("@/components/sales/revenue-comparison-chart").then(mod => ({ default: mod.RevenueComparisonChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const SeasonalAnalysisChart = dynamic(
  () => import("@/components/sales/seasonal-analysis-chart").then(mod => ({ default: mod.SeasonalAnalysisChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const SalesByCategoryChart = dynamic(
  () => import("@/components/sales/sales-by-category-chart").then(mod => ({ default: mod.SalesByCategoryChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const RegionsAndCustomersTabs = dynamic(
  () => import("@/components/sales/regions-and-customers-tabs").then(mod => ({ default: mod.RegionsAndCustomersTabs })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const TopSkusTable = dynamic(
  () => import("@/components/sales/top-skus-table").then(mod => ({ default: mod.TopSkusTable })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

// Loading skeleton for charts
function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function AnalyticsContent() {
  const { setFilters } = useDateFilters();

  const handleDateChange = (filters: { year: number; month?: number }) => {
    setFilters(filters);
  };

  return (
    <MainLayout
      pageTitle="Sales Analytics"
      pageSubtitle="Comprehensive sales performance analysis and insights"
    >
      <div className="space-y-8 pb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Sales Analytics
                </h1>
                <p className="text-gray-600 text-base mt-1">
                  Real-time insights into your sales performance
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl px-4 py-3 border border-teal-200 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            <div className="text-right">
              <p className="text-xs text-gray-600">Live Data</p>
              <p className="text-sm font-semibold text-teal-600">Updated Now</p>
            </div>
          </div>
        </div>

        <GlobalDateFilter onDateChange={handleDateChange} />

        <SalesMetricsCards />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-1">
            <RevenueComparisonChart />
          </div>

          <div className="xl:col-span-1">
            <SeasonalAnalysisChart />
          </div>
        </div>

        <SalesByCategoryChart />

        <RegionsAndCustomersTabs />

        <TopSkusTable />
      </div>
    </MainLayout>
  );
}

export default function SalesAnalyticsPage() {
  return (
    <EnhancedAuthProvider>
      <DateFilterProvider>
        <AnalyticsContent />
      </DateFilterProvider>
    </EnhancedAuthProvider>
  );
}
