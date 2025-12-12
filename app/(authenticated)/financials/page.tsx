"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { FinancialDashboard } from "@/components/financial/financial-dashboard";
import { Loader2 } from "lucide-react";

export default function FinancialsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Financial Dashboard" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Financial Dashboard" 
        pageSubtitle="Comprehensive financial management and analytics"
        hideTitle={true} // Let the FinancialDashboard component handle its own title
      >
        <FinancialDashboard
          brandId={profile?.brand_id}
          distributorId={profile?.distributor_id}
          showComparison={true}
        />
      </MainLayout>
    </ProtectedPage>
  );
}

