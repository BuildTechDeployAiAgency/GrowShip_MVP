"use client";

import DashboardContent from "./dashboard-content";
import { DateFilterProvider } from "@/contexts/date-filter-context";
import type { DashboardMetrics } from "@/types/dashboard";

export interface DashboardClientProps {
  initialMetrics?: DashboardMetrics | null;
}

export default function DashboardClient({ initialMetrics }: DashboardClientProps) {
  return (
    <DateFilterProvider>
      <DashboardContent initialMetrics={initialMetrics} />
    </DateFilterProvider>
  );
}
