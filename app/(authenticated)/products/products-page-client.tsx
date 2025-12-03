"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ProductsList } from "@/components/products/products-list";
import { ProtectedPage } from "@/components/common/protected-page";

export function ProductsPageClient() {
  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <MainLayout
        pageTitle="Products"
        pageSubtitle="Manage your product catalog and inventory"
      >
        <ProductsList />
      </MainLayout>
    </ProtectedPage>
  );
}

