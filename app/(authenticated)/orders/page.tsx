"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { OrdersList } from "@/components/orders/orders-list";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const router = useRouter();
  const { user, profile, loading } = useRequireProfile();
  const [mounted, setMounted] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <MainLayout pageTitle="Orders" pageSubtitle="Loading...">
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
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </div>
          }
        >
          <OrdersList 
            onCreateOrder={() => setShowCreateDialog(true)}
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
    </EnhancedAuthProvider>
  );
}

