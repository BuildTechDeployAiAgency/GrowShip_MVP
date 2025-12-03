"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { OrdersList } from "@/components/orders/orders-list";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { ProtectedPage } from "@/components/common/protected-page";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export function OrdersPageClient() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { profile } = useEnhancedAuth();
  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Orders"
        pageSubtitle="Manage and track all your orders"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/import?type=orders")}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Orders
            </Button>
            <Button
              onClick={() => {
                if (!isDistributorAdmin) {
                  setShowCreateDialog(true);
                }
              }}
              disabled={isDistributorAdmin}
              title={
                isDistributorAdmin
                  ? "Distributor users cannot create orders"
                  : undefined
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        }
      >
        <OrdersList
          onCreateOrder={() => {
            if (!isDistributorAdmin) {
              setShowCreateDialog(true);
            }
          }}
        />

        <OrderFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            // Trigger refresh of orders list
            window.location.reload();
          }}
        />
      </MainLayout>
    </ProtectedPage>
  );
}
