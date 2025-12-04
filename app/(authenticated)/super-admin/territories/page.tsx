import { TerritoryManagement } from "@/components/super-admin/territory-management";
import { MainLayout } from "@/components/layout/main-layout";

export default function TerritoriesPage() {
  return (
    <MainLayout
      pageTitle="Territory Management"
      pageSubtitle="Manage regions and territories for geographic reporting"
    >
      <TerritoryManagement />
    </MainLayout>
  );
}

