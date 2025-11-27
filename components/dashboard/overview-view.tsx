"use client";

import { SearchFilter } from "@/components/dashboard/search-filter";
import { PendingUserWarning } from "@/components/common/pending-user-warning";
import { useDateFilters } from "@/contexts/date-filter-context";
import { GlobalDateFilter } from "@/components/sales/global-date-filter";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import type { DashboardMetrics } from "@/types/dashboard";

// Lazy load heavy chart components for better performance
const SalesMetricsCards = dynamic(
  () =>
    import("@/components/sales/sales-metrics-cards").then((mod) => ({
      default: mod.SalesMetricsCards,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const RevenueComparisonChart = dynamic(
  () =>
    import("@/components/sales/revenue-comparison-chart").then((mod) => ({
      default: mod.RevenueComparisonChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const SeasonalAnalysisChart = dynamic(
  () =>
    import("@/components/sales/seasonal-analysis-chart").then((mod) => ({
      default: mod.SeasonalAnalysisChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const SalesByCategoryChart = dynamic(
  () =>
    import("@/components/sales/sales-by-category-chart").then((mod) => ({
      default: mod.SalesByCategoryChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const TargetsVsActualsChart = dynamic(
  () =>
    import("@/components/sales/targets-vs-actuals-chart").then((mod) => ({
      default: mod.TargetsVsActualsChart,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const OrderFulfillmentMetrics = dynamic(
  () =>
    import("@/components/sales/order-fulfillment-metrics").then((mod) => ({
      default: mod.OrderFulfillmentMetrics,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const RegionsAndCustomersTabs = dynamic(
  () =>
    import("@/components/sales/regions-and-customers-tabs").then((mod) => ({
      default: mod.RegionsAndCustomersTabs,
    })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const TopSkusTable = dynamic(
  () =>
    import("@/components/sales/top-skus-table").then((mod) => ({
      default: mod.TopSkusTable,
    })),
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

      {/* Key Metrics Cards */}
      <SalesMetricsCards initialData={initialMetrics} />

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

      {/* Analytics Charts Grid */}
      <div className="space-y-6">
        {/* Row 1: Revenue Comparison & Seasonal Analysis */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-1">
            <RevenueComparisonChart />
          </div>
          <div className="xl:col-span-1">
            <SeasonalAnalysisChart />
          </div>
        </div>

        {/* Row 2: Sales by Category (Full Width) */}
        <div className="grid grid-cols-1">
          <SalesByCategoryChart />
        </div>

        {/* Row 3: Targets vs Actuals & Order Fulfillment */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="xl:col-span-1">
            <TargetsVsActualsChart />
          </div>
          <div className="xl:col-span-1">
            <OrderFulfillmentMetrics />
          </div>
        </div>

        {/* Row 4: Regions and Customers (Full Width) */}
        <div className="grid grid-cols-1">
          <RegionsAndCustomersTabs />
        </div>

        {/* Row 5: Top SKUs Table (Full Width) */}
        <div className="grid grid-cols-1">
          <TopSkusTable />
        </div>
      </div>
    </div>
  );
}

