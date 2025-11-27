import { SuperAdminDashboard } from "@/components/super-admin/super-admin-dashboard";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { MainLayout } from "@/components/layout/main-layout";

export default function SuperAdminPage() {
  return (
    <EnhancedAuthProvider>
      <MainLayout
        pageTitle="Super Admin"
        pageSubtitle="Manage all organizations and users across GrowShip"
      >
        <SuperAdminDashboard />
      </MainLayout>
    </EnhancedAuthProvider>
  );
}


