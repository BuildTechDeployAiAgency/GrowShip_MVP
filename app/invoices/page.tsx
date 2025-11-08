"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { InvoicesList } from "@/components/invoices/invoices-list";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";

export default function InvoicesPage() {
  const { user, profile, loading } = useRequireProfile();
  const [isFormOpen, setIsFormOpen] = useState(false);

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
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          }
        >
          <InvoicesList />
          
          <InvoiceFormDialog
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            invoice={null}
            onSuccess={() => {
              // Refetch is handled automatically by the hook
            }}
          />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

