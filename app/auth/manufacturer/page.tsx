import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { AuthPage } from "@/components/auth/auth-page";

export default function ManufacturerLoginPage() {
  return (
    <EnhancedAuthProvider>
      <AuthPage role="manufacturer" />
    </EnhancedAuthProvider>
  );
}
