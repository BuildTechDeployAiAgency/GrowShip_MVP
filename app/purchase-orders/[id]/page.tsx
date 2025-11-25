"use client";

import { use } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { PODetails } from "@/components/purchase-orders/po-details";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";

export default function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile, loading } = useRequireProfile();
  const { id } = use(params);

  if (loading) {
    return (
      <MainLayout pageTitle="Purchase Order Details" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <MainLayout
          pageTitle="Purchase Order Details"
          pageSubtitle="View and manage purchase order information"
        >
          <PODetails poId={id} />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

