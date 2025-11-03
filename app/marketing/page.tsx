"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export default function MarketingPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Marketing" pageSubtitle="Loading...">
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
          pageTitle="Marketing"
          pageSubtitle="Manage marketing campaigns"
        >
          <Card>
            <CardContent className="p-12 text-center">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Marketing
              </h3>
              <p className="text-gray-600 mb-6">
                Marketing campaign management functionality will be implemented here.
              </p>
            </CardContent>
          </Card>
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

