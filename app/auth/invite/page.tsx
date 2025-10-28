"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

function InviteHandlerContent() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleInvitation = async () => {
      try {
        console.log("=== INVITATION HANDLER START ===");
        console.log("Current URL:", window.location.href);
        console.log("Hash:", window.location.hash);

        const hashString = window.location.hash.substring(1);
        console.log("Hash string (after substring):", hashString);

        const hashParams = new URLSearchParams(hashString);
        console.log(
          "Hash params object:",
          Object.fromEntries(hashParams.entries())
        );

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        console.log("Parsed parameters:", {
          accessToken: accessToken
            ? `${accessToken.substring(0, 20)}...`
            : "missing",
          refreshToken: refreshToken
            ? `${refreshToken.substring(0, 10)}...`
            : "missing",
          type,
        });

        if (accessToken && refreshToken && type === "invite") {
          console.log(
            "✅ All required parameters found, processing invitation..."
          );

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          console.log("Session set result:", {
            data: data ? "present" : "missing",
            error: error ? error.message : "none",
          });

          if (error) {
            console.error("❌ Error setting session from invitation:", error);
            toast.error(
              "Invalid invitation link. Please request a new invitation."
            );
            router.push("/");
            return;
          }

          // Verify that the user profile exists
          console.log("✅ Session set successfully, verifying user profile...");

          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("id, role_type, user_status")
            .eq("user_id", data.user?.id)
            .maybeSingle();

          if (profileError) {
            console.error("❌ Error loading user profile:", profileError);
            toast.error("Failed to load user profile. Please try again.");
            router.push("/");
            return;
          }

          if (!profile) {
            console.error("❌ No user profile found");
            toast.error("User profile not found. Please contact support.");
            router.push("/");
            return;
          }

          console.log(
            "✅ User profile verified, redirecting to password setup in 1 second..."
          );

          // Add a small delay to ensure session is properly set
          setTimeout(() => {
            console.log("🔄 Redirecting to /auth/setup-password");
            router.push("/auth/setup-password");
          }, 1000);
          return;
        }

        console.log("❌ Missing required parameters, redirecting to home");
        console.log("Missing:", {
          accessToken: !accessToken,
          refreshToken: !refreshToken,
          type: type !== "invite",
        });
        router.push("/");
      } catch (error) {
        console.error("❌ Unexpected error in invite handler:", error);
        toast.error("An unexpected error occurred");
        router.push("/");
      }
    };

    // Add a small delay to ensure the page is fully loaded
    setTimeout(() => {
      handleInvitation();
    }, 100);
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Processing your invitation...
        </h2>
        <p className="text-gray-600 mb-4">
          Please wait while we set up your account.
        </p>
        <p className="text-sm text-gray-500">
          If you're not redirected automatically, please check the browser
          console for details.
        </p>
        <div className="mt-4">
          <button
            onClick={() => {
              console.log("Manual redirect triggered");
              router.push("/auth/setup-password");
            }}
            className="text-teal-600 hover:text-teal-700 underline text-sm"
          >
            Click here if not redirected automatically
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InviteHandlerPage() {
  return <InviteHandlerContent />;
}
