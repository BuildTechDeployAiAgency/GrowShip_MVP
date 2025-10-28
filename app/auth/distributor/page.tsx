import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { AuthPage } from "@/components/auth/auth-page";

export default function DistributorLoginPage() {
  return (
    <EnhancedAuthProvider>
      <AuthPage role="distributor" />
    </EnhancedAuthProvider>
  );
}
