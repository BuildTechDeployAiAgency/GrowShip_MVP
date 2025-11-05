"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { OrderDetails } from "@/components/orders/order-details";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Order Details" pageSubtitle="Loading...">
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
          pageTitle="Order Details"
          pageSubtitle="View and manage order information"
        >
          <OrderDetails orderId={params.id} />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

