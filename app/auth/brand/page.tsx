import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { AuthPage } from "@/components/auth/auth-page";

export default function BrandLoginPage() {
  return (
    <EnhancedAuthProvider>
      <AuthPage role="brand" />
    </EnhancedAuthProvider>
  );
}
