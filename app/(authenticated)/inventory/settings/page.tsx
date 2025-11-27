"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { InventorySettingsContent } from "@/components/inventory/inventory-settings-content";

export default function InventorySettingsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Inventory Settings" pageSubtitle="Loading...">
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
          pageTitle="Inventory Settings"
          pageSubtitle="Configure stock alert thresholds for your products"
        >
          <InventorySettingsContent brandId={profile?.brand_id} />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

