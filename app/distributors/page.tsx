"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { DistributorsList } from "@/components/distributors/distributors-list";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DistributorsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Distributors" pageSubtitle="Loading...">
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
          pageTitle="Distributors"
          pageSubtitle="Manage distributor relationships"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Distributor
            </Button>
          }
        >
          <DistributorsList />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

