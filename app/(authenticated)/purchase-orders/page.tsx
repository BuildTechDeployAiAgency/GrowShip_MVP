"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { PurchaseOrdersList } from "@/components/purchase-orders/po-list";
import { POFormDialog } from "@/components/purchase-orders/po-form-dialog";
import { ProtectedPage } from "@/components/common/protected-page";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PurchaseOrdersPage() {
  const { user, profile, loading } = useRequireProfile();
  const [mounted, setMounted] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <MainLayout pageTitle="Purchase Orders" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Purchase Orders"
        pageSubtitle="Manage purchase orders and supplier relationships"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        }
      >
        <PurchaseOrdersList />

        <POFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            // Trigger refresh of purchase orders list
            window.location.reload();
          }}
        />
      </MainLayout>
    </ProtectedPage>
  );
}

