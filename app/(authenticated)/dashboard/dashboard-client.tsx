"use client";

import DashboardContent from "./dashboard-content";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { DateFilterProvider } from "@/contexts/date-filter-context";
import type { DashboardMetrics } from "@/types/dashboard";

export interface DashboardClientProps {
  initialMetrics?: DashboardMetrics | null;
}

export default function DashboardClient({ initialMetrics }: DashboardClientProps) {
  return (
    <EnhancedAuthProvider>
      <DateFilterProvider>
        <DashboardContent initialMetrics={initialMetrics} />
      </DateFilterProvider>
    </EnhancedAuthProvider>
  );
}
