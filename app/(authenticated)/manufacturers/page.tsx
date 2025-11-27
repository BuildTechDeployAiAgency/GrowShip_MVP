"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ManufacturersList } from "@/components/manufacturers/manufacturers-list";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";

export default function ManufacturersPage() {
  const { user, profile, loading } = useRequireProfile();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <MainLayout pageTitle="Manufacturers" pageSubtitle="Loading...">
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
          pageTitle="Manufacturers"
          pageSubtitle="Manage your manufacturer relationships and supplier network"
        >
          <ManufacturersList />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}
