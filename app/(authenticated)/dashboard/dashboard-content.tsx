"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { OverviewView } from "@/components/dashboard/overview-view";
import { SalesMetricsView } from "@/components/dashboard/sales-metrics-view";
import { DistributorSearchFilter } from "@/components/dashboard/distributor-search-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useDateFilters } from "@/contexts/date-filter-context";
import type { DashboardMetrics } from "@/types/dashboard";

type DashboardView = "overview" | "sales";

export interface DashboardContentProps {
  initialMetrics?: DashboardMetrics | null;
}

export default function DashboardContent({ initialMetrics }: DashboardContentProps = {}) {
  const { profile } = useEnhancedAuth();
  const { filters, setDistributorFilter } = useDateFilters();
  
  // Determine if user is a distributor (should only see sales view)
  const isDistributor = profile?.role_name?.startsWith("distributor");
  
  // Check if user can filter by distributor (brand admins and super admins)
  const canFilterByDistributor = 
    profile?.role_name === "super_admin" || 
    profile?.role_name?.startsWith("brand_admin");
  
  // Force sales view for distributors, otherwise default to overview
  const [currentView, setCurrentView] = useState<DashboardView>(
    isDistributor ? "sales" : "overview"
  );

  const viewLabels: Record<DashboardView, string> = {
    overview: "Overview",
    sales: "Sales Metrics",
  };

  const DashboardTitle = (
    <div className="flex items-center gap-2">
      <span>Dashboard</span>
      {/* Only show view selector for non-distributors */}
      {!isDistributor && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-sm font-normal text-gray-600 hover:text-gray-900"
            >
              <span>({viewLabels[currentView]})</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setCurrentView("overview")}>
              Overview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrentView("sales")}>
              Sales Metrics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Show current view for distributors */}
      {isDistributor && (
        <span className="text-sm text-gray-600">({viewLabels[currentView]})</span>
      )}
    </div>
  );

  const headerActions = canFilterByDistributor ? (
    <DistributorSearchFilter
      selectedDistributorId={filters.distributorId}
      onDistributorSelect={setDistributorFilter}
    />
  ) : null;

  return (
    <MainLayout
      pageTitle={DashboardTitle}
      pageSubtitle="Welcome to your business portal"
      actions={headerActions}
    >
      {/* Distributors always see sales view, others can choose */}
      {isDistributor || currentView === "sales" ? (
        <SalesMetricsView />
      ) : (
        <OverviewView initialMetrics={initialMetrics} />
      )}
    </MainLayout>
  );
}
