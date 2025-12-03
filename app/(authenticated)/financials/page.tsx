"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function FinancialsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Financials" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Financials"
        pageSubtitle="Financial reports and analytics"
      >
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Financials
            </h3>
            <p className="text-gray-600 mb-6">
              Financial analytics and reporting functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    </ProtectedPage>
  );
}

