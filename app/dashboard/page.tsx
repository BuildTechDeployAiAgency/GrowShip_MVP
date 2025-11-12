"use client";

import DashboardContent from "@/app/dashboard/dashboard-content";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { DateFilterProvider } from "@/contexts/date-filter-context";

export default function DashboardPage() {
  return (
    <EnhancedAuthProvider>
      <DateFilterProvider>
        <DashboardContent />
      </DateFilterProvider>
    </EnhancedAuthProvider>
  );
}
