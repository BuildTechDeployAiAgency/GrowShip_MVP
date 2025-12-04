"use client";

import { Suspense } from "react";
import { SearchFilter } from "@/components/dashboard/search-filter";
import { PendingUserWarning } from "@/components/common/pending-user-warning";
import { useDateFilters } from "@/contexts/date-filter-context";
import { GlobalDateFilter } from "@/components/sales/global-date-filter";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import type { DashboardMetrics } from "@/types/dashboard";

// Loading skeleton for charts - used by Suspense boundaries
function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// Loading skeleton for metric cards
function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-lg border-0 overflow-hidden"
        >
          <div className="h-1 w-full bg-gray-200" />
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-3" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Lazy load heavy chart components for better performance with Suspense
const SalesMetricsCards = dynamic(
  () =>
    import("@/components/sales/sales-metrics-cards").then((mod) => ({
      default: mod.SalesMetricsCards,
    })),
  { ssr: false }
);

const RevenueComparisonChart = dynamic(
  () =>
    import("@/components/sales/revenue-comparison-chart").then((mod) => ({
      default: mod.RevenueComparisonChart,
    })),
  { ssr: false }
);

const SeasonalAnalysisChart = dynamic(
  () =>
    import("@/components/sales/seasonal-analysis-chart").then((mod) => ({
      default: mod.SeasonalAnalysisChart,
    })),
  { ssr: false }
);

const SalesByCategoryChart = dynamic(
  () =>
    import("@/components/sales/sales-by-category-chart").then((mod) => ({
      default: mod.SalesByCategoryChart,
    })),
  { ssr: false }
);

const TargetsVsActualsChart = dynamic(
  () =>
    import("@/components/sales/targets-vs-actuals-chart").then((mod) => ({
      default: mod.TargetsVsActualsChart,
    })),
  { ssr: false }
);

const OrderFulfillmentMetrics = dynamic(
  () =>
    import("@/components/sales/order-fulfillment-metrics").then((mod) => ({
      default: mod.OrderFulfillmentMetrics,
    })),
  { ssr: false }
);

const RegionsAndCustomersTabs = dynamic(
  () =>
    import("@/components/sales/regions-and-customers-tabs").then((mod) => ({
      default: mod.RegionsAndCustomersTabs,
    })),
  { ssr: false }
);

const TopSkusTable = dynamic(
  () =>
    import("@/components/sales/top-skus-table").then((mod) => ({
      default: mod.TopSkusTable,
    })),
  { ssr: false }
);

const SalesByChannelChart = dynamic(
  () =>
    import("@/components/dashboard/sales-by-channel-chart").then((mod) => ({
      default: mod.SalesByChannelChart,
    })),
  { ssr: false }
);

const CampaignPerformanceWidget = dynamic(
  () =>
    import("@/components/dashboard/campaign-performance-widget").then((mod) => ({
      default: mod.CampaignPerformanceWidget,
    })),
  { ssr: false }
);

export interface OverviewViewProps {
  initialMetrics?: DashboardMetrics | null;
}

export function OverviewView({ initialMetrics }: OverviewViewProps = {}) {
  const { setFilters } = useDateFilters();

  const handleDateChange = (filters: { year: number; month?: number }) => {
    setFilters(filters);
  };

  return (
    <div className="space-y-6 pb-8">
      <PendingUserWarning />

      {/* Key Metrics Cards - with Suspense for parallel loading */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <SalesMetricsCards initialData={initialMetrics} />
      </Suspense>

      {/* Search Filter for Distributors */}
      <SearchFilter
        searchPlaceholder="Search distributors or locations..."
        filterLabel="All Status"
        filterOptions={[
          { label: "All Status", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
      />

      {/* Date Filter for Analytics */}
      <GlobalDateFilter onDateChange={handleDateChange} />

      {/* Analytics Charts Grid - Each section wrapped in Suspense for parallel streaming */}
      <div className="space-y-6">
        {/* Row 1: Revenue Comparison & Seasonal Analysis - load in parallel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <RevenueComparisonChart />
            </Suspense>
          </div>
          <div className="xl:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <SeasonalAnalysisChart />
            </Suspense>
          </div>
        </div>

        {/* Row 2: Sales by Category (Full Width) */}
        <div className="grid grid-cols-1">
          <Suspense fallback={<ChartSkeleton />}>
            <SalesByCategoryChart />
          </Suspense>
        </div>

        {/* Row 3: Targets vs Actuals & Order Fulfillment - load in parallel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <TargetsVsActualsChart />
            </Suspense>
          </div>
          <div className="xl:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <OrderFulfillmentMetrics />
            </Suspense>
          </div>
        </div>

        {/* Row 4: Regions and Customers (Full Width) */}
        <div className="grid grid-cols-1">
          <Suspense fallback={<ChartSkeleton />}>
            <RegionsAndCustomersTabs />
          </Suspense>
        </div>

        {/* Row 5: Top SKUs Table (Full Width) */}
        <div className="grid grid-cols-1">
          <Suspense fallback={<ChartSkeleton />}>
            <TopSkusTable />
          </Suspense>
        </div>

        {/* Row 6: Sales by Channel & Campaign Performance - load in parallel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <SalesByChannelChart />
            </Suspense>
          </div>
          <div className="xl:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <CampaignPerformanceWidget />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

