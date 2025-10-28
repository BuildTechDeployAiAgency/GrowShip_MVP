"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "react-toastify";

export function useUserStatusProtection() {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!profile) return;

    // Check if user is trying to access restricted pages
    const restrictedPaths = ["/settings", "/users", "/profile"];
    const isRestrictedPath = restrictedPaths.some((path) =>
      pathname.startsWith(path)
    );

    if (profile.user_status === "pending" && isRestrictedPath) {
      toast.warning(
        "Your account is pending approval. You can only access the dashboard until approved."
      );
      router.push("/dashboard");
    }
  }, [profile, pathname, router]);

  return {
    isPendingUser: profile?.user_status === "pending",
    isSuspendedUser: profile?.user_status === "suspended",
    isApprovedUser: profile?.user_status === "approved",
  };
}
