"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SalesPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to sales analytics page
    router.replace("/sales/analytics");
  }, [router]);

  return (
    <MainLayout pageTitle="Sales" pageSubtitle="Redirecting...">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    </MainLayout>
  );
}
