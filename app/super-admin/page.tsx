import { SuperAdminDashboard } from "@/components/super-admin/super-admin-dashboard";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";

export default function SuperAdminPage() {
  return (
    <EnhancedAuthProvider>
      <SuperAdminDashboard />
    </EnhancedAuthProvider>
  );
}


