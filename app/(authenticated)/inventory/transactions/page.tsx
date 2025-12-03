"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { InventoryTransactionsList } from "@/components/inventory/inventory-transactions-list";

export default function InventoryTransactionsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Inventory Transactions" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Inventory Transactions"
        pageSubtitle="Complete history of all stock movements"
      >
        <InventoryTransactionsList />
      </MainLayout>
    </ProtectedPage>
  );
}

