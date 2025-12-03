"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ShipmentsList } from "@/components/shipments/shipments-list";
import { ProtectedPage } from "@/components/common/protected-page";

export default function ShipmentsPage() {
  const { loading } = useRequireProfile();

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
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Shipments"
        pageSubtitle="Track and manage all shipments. Create new shipments from the Orders page."
      >
        <ShipmentsList />
      </MainLayout>
    </ProtectedPage>
  );
}

