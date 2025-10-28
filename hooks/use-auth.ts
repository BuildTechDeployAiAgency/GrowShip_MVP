"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  return { user, loading };
}

export function useRequireProfile() {
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (
      !loading &&
      !profileLoading &&
      user &&
      (!profile || !profile.is_profile_complete)
    ) {
      router.push("/profile/setup");
    }
  }, [user, profile, loading, profileLoading, router]);

  return { user, profile, loading: loading || profileLoading };
}
