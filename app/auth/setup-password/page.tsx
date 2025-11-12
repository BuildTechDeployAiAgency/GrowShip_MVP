"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import {
  PasswordValidation,
  PasswordInput,
  validatePassword,
} from "@/components/ui/password-validation";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";

function SetupPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        console.log("Password setup - URL hash params:", {
          accessToken: accessToken ? "present" : "missing",
          refreshToken: refreshToken ? "present" : "missing",
          type,
        });

        // Set session from hash parameters if available
        if (accessToken && refreshToken && type === "invite") {
          console.log("Setting session from invitation link...");

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session from invitation:", error);
            toast.error(
              "Invalid invitation link. Please request a new invitation."
            );
            router.push("/");
            return;
          }

          console.log("Session set successfully from invitation");
          
          // Give time for session to be fully established
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Now get the session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          toast.error("Invalid or expired invitation link");
          router.push("/");
          return;
        }

        if (session?.user) {
          console.log("Valid session found for user:", session.user.id);
          
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("contact_name, role_name, role_type, is_profile_complete, user_status")
            .eq("user_id", session.user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
            toast.error("Unable to load user profile. Please contact support.");
            router.push("/");
            return;
          }

          if (profile && !profile.is_profile_complete) {
            console.log("Profile incomplete, allowing password setup");
            setIsValidSession(true);
            setUserEmail(session.user.email || "");
            setUserName(profile.contact_name || "");
          } else if (profile && profile.is_profile_complete) {
            console.log("Profile already complete, redirecting to dashboard");
            toast.info(
              "You already have a password set. Redirecting to dashboard..."
            );
            router.push("/dashboard");
          } else {
            console.error("No profile found for user");
            toast.error("Invalid invitation. No profile found.");
            router.push("/");
          }
        } else {
          console.error("No valid session found");
          toast.error("Invalid or expired invitation link");
          router.push("/");
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred");
        router.push("/");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const { isValid, errors } = validatePassword(password);
    if (!isValid) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Password update error:", error);
        toast.error(error.message || "Failed to set password");
      } else {
        setSuccess(true);
        toast.success("Password set successfully! Please log in to continue.");

        // Get user profile to determine role and redirect to appropriate login page
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role_type")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .single();

        // Sign out the user so they can log in with their new password
        await supabase.auth.signOut();

        setTimeout(() => {
          if (profile?.role_type) {
            router.push(`/auth/${profile.role_type}`);
          } else {
            router.push("/");
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Invitation Link
            </h2>
            <p className="text-gray-600 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => router.push("/")}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Welcome to GrowShip!
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your password has been set successfully. Please log in to
              continue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-teal-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Set Your Password
          </CardTitle>
          <CardDescription className="text-gray-600">
            {userName && (
              <span className="block mb-2">Welcome, {userName}!</span>
            )}
            Complete your account setup by creating a secure password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-gray-50 text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password *
              </Label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Create a secure password"
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700"
              >
                Confirm Password *
              </Label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm your password"
                className="w-full"
                required
              />
            </div>

            <PasswordValidation password={password} />

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? "Setting Password..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <EnhancedAuthProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-gray-600 animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Loading...
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your invitation link.
                </p>
              </CardContent>
            </Card>
          </div>
        }
      >
        <SetupPasswordContent />
      </Suspense>
    </EnhancedAuthProvider>
  );
}
