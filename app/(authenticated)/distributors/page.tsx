"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { DistributorsList } from "@/components/distributors/distributors-list";
import { ProtectedPage } from "@/components/common/protected-page";

export default function DistributorsPage() {
  const { user, profile, loading } = useRequireProfile();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <MainLayout pageTitle="Customers" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Customers"
        pageSubtitle="Manage customer relationships"
      >
        <DistributorsList />
      </MainLayout>
    </ProtectedPage>
  );
}
