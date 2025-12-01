"use client";

import { use } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { OrderDetails } from "@/components/orders/order-details";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function OrderDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-20" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile, loading } = useRequireProfile();
  const { id } = use(params);

  if (loading) {
    return (
      <MainLayout pageTitle="Order Details" pageSubtitle="Loading order information...">
        <OrderDetailsSkeleton />
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Order Details"
        pageSubtitle="View and manage order information"
      >
        <OrderDetails orderId={id} />
      </MainLayout>
    </ProtectedPage>
  );
}

