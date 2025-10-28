"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { SalesDateFilter } from "@/components/sales/sales-date-filter";
import { ImportDataDialog } from "@/components/sales/import-data-dialog";
import { ExportOptionsMenu } from "@/components/sales/export-options-menu";
import { Upload, Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type TabValue = "overview" | "analytics" | "reports";

interface Tab {
  value: TabValue;
  label: string;
}

const tabs: Tab[] = [
  { value: "overview", label: "Overview" },
  { value: "analytics", label: "Analytics" },
  { value: "reports", label: "Reports" },
];

interface SalesToolbarProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  onDateChange: (dateRange: { from: Date; to: Date }) => void;
}

export function SalesToolbar({
  activeTab,
  onTabChange,
  onDateChange,
}: SalesToolbarProps) {
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="hidden sm:block">
          <SalesDateFilter onDateChange={onDateChange} />
        </div>

        <div className="sm:hidden w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filters
            </span>
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="hidden sm:block">
            <ImportDataDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              }
            />
          </div>
          <ExportOptionsMenu fileName="sales_dashboard_data" />
        </div>
      </div>

      {showMobileFilters && (
        <div className="sm:hidden space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <SalesDateFilter onDateChange={onDateChange} />
          <ImportDataDialog
            trigger={
              <Button variant="outline" size="sm" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            }
          />
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "whitespace-nowrap py-3 px-6 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.value
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
