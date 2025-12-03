"use client";

import { ProfileSetup } from "@/components/auth/profile-setup";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

function ProfileSetupPageContent() {
  const { user, profile, loading, profileLoading } = useEnhancedAuth();
  const router = useRouter();
  const redirectAttempted = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Prevent multiple redirect attempts
    if (redirectAttempted.current) {
      return;
    }

    // Wait for loading to complete before checking
    if (loading || profileLoading) {
      return;
    }

    // Add a small delay to ensure profile data is stable
    checkTimeoutRef.current = setTimeout(() => {
      if (!user) {
        console.log("[Profile Setup] No user found, redirecting to home");
        redirectAttempted.current = true;
        router.replace("/");
        return;
      }

      // Only redirect if profile is definitely complete
      // This prevents redirect loops caused by stale cache data
      if (profile?.is_profile_complete === true) {
        console.log("[Profile Setup] Profile complete, redirecting to dashboard");
        redirectAttempted.current = true;
        // Use replace instead of push to prevent back navigation issues
        router.replace("/dashboard");
        return;
      }

      // If profile exists but is incomplete, allow setup to proceed
      if (profile && profile.is_profile_complete === false) {
        console.log("[Profile Setup] Profile incomplete, showing setup form");
        redirectAttempted.current = false; // Reset to allow form submission
      }
    }, 100); // Small delay to ensure data consistency

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
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
  return <ProfileSetupPageContent />;
}
