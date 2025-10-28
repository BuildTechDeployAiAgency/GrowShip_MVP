"use client";

import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { MetricsGrid } from "@/components/dashboard/metrics-cards";
import { SearchFilter } from "@/components/dashboard/search-filter";
import { PendingUserWarning } from "@/components/common/pending-user-warning";
import { Users, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

export default function DashboardContent() {
  const metrics = [
    {
      title: "Total Distributors",
      value: "4",
      icon: Users,
    },
    {
      title: "Total Revenue",
      value: "$202,600",
      icon: TrendingUp,
    },
    {
      title: "Overdue Payments",
      value: "$17,700",
      icon: AlertTriangle,
    },
    {
      title: "Avg Growth",
      value: "+14.5%",
      icon: BarChart3,
      trend: { value: "14.5%", isPositive: true },
    },
  ];

  const headerActions = (
    <>
      <Button variant="outline" size="sm">
        Export Data
      </Button>
      <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
        Add Distributor
      </Button>
    </>
  );

  return (
    <MainLayout
      pageTitle="Dashboard"
      pageSubtitle="Welcome to your business portal"
      actions={headerActions}
    >
      <PendingUserWarning />

      <MetricsGrid metrics={metrics} />

      <SearchFilter
        searchPlaceholder="Search distributors or locations..."
        filterLabel="All Status"
        filterOptions={[
          { label: "All Status", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        This is the dashboard content
      </div>
    </MainLayout>
  );
}
