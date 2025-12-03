import { SuperAdminDashboard } from "@/components/super-admin/super-admin-dashboard";
import { MainLayout } from "@/components/layout/main-layout";

export default function SuperAdminPage() {
  return (
    <MainLayout
      pageTitle="Super Admin"
      pageSubtitle="Manage all organizations and users across GrowShip"
    >
      <SuperAdminDashboard />
    </MainLayout>
  );
}


