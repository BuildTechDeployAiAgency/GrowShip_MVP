"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ShipmentsList } from "@/components/shipments/shipments-list";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShipmentsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Shipments" pageSubtitle="Loading...">
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
          pageTitle="Shipments"
          pageSubtitle="Track and manage shipments"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Shipment
            </Button>
          }
        >
          <ShipmentsList />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

