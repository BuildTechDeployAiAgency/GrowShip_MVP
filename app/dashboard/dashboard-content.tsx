"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { OverviewView } from "@/components/dashboard/overview-view";
import { SalesMetricsView } from "@/components/dashboard/sales-metrics-view";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type DashboardView = "overview" | "sales";

export default function DashboardContent() {
  const [currentView, setCurrentView] = useState<DashboardView>("overview");

  const viewLabels: Record<DashboardView, string> = {
    overview: "Overview",
    sales: "Sales Metrics",
  };

  const DashboardTitle = (
    <div className="flex items-center gap-2">
      <span>Dashboard</span>
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
    </div>
  );

  const headerActions = (
    <>
      <Button variant="outline" size="sm">
        Export Data
      </Button>
      {currentView === "overview" && (
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
          Add Distributor
        </Button>
      )}
    </>
  );

  return (
    <MainLayout
      pageTitle={DashboardTitle}
      pageSubtitle="Welcome to your business portal"
      actions={headerActions}
    >
      {currentView === "overview" ? <OverviewView /> : <SalesMetricsView />}
    </MainLayout>
  );
}
