"use client";

import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { ProfileSetup } from "@/components/auth/profile-setup";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function ProfileSetupPageContent() {
  const { user, profile, loading, profileLoading } = useEnhancedAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profileLoading) {
      if (!user) {
        router.push("/");
        return;
      }

      if (profile && profile.is_profile_complete) {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, profile, loading, profileLoading, router]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading...
          </h2>
          <p className="text-gray-600">
            Please wait while we load your profile information.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to home
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Profile Not Found
          </h2>
          <p className="text-gray-600">
            No profile found for your account. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileSetup role={profile.role_type} />;
}

export default function ProfileSetupPage() {
  return (
    <EnhancedAuthProvider>
      <ProfileSetupPageContent />
    </EnhancedAuthProvider>
  );
}
