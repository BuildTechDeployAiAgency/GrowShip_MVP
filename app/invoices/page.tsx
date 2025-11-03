"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { InvoicesList } from "@/components/invoices/invoices-list";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvoicesPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Invoices" pageSubtitle="Loading...">
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
          pageTitle="Invoices"
          pageSubtitle="Manage invoices and payments"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          }
        >
          <InvoicesList />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

