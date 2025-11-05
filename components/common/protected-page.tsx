"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";

interface ProtectedPageProps {
  children: React.ReactNode;
  allowedStatuses?: ("approved" | "pending" | "suspended")[];
  fallbackPath?: string;
  showFallbackUI?: boolean;
}

export function ProtectedPage({
  children,
  allowedStatuses = ["approved"],
  fallbackPath = "/dashboard",
  showFallbackUI = true,
}: ProtectedPageProps) {
  const { profile, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!profile || profileLoading) return;

    if (!allowedStatuses.includes(profile.user_status)) {
      if (profile.user_status === "pending") {
        toast.warning(
          "Your account is pending approval. You can only access the dashboard until approved."
        );
      } else if (profile.user_status === "suspended") {
        toast.error(
          "Your account has been suspended. Please contact your administrator."
        );
      }

      router.push(fallbackPath);
    }
  }, [profile, profileLoading, allowedStatuses, fallbackPath, router]);

  // Show loading spinner while profile is being fetched
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Only show access restricted after loading is complete
  if (!profile || !allowedStatuses.includes(profile.user_status)) {
    if (!showFallbackUI) {
      return null;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Restricted
            </h1>
            <p className="text-gray-600 mb-6">
              {profile?.user_status === "pending"
                ? "Your account is pending approval. You can only access the dashboard until approved."
                : profile?.user_status === "suspended"
                ? "Your account has been suspended. Please contact your administrator."
                : "You don't have permission to access this page."}
            </p>
          </div>

          <Button onClick={() => router.push(fallbackPath)} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
