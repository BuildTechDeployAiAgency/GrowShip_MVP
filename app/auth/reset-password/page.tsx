"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Lock, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { updatePassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const establishSession = async () => {
      // First, check for hash parameters (for magic link/email confirmation flows)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      // Check for code parameter (for PKCE flows)
      const code = searchParams.get("code");

      console.log("Reset password flow - checking parameters:", {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasCode: !!code,
        type,
      });

      // Handle hash-based session (magic link/email confirmation)
      if (accessToken && refreshToken && type === "recovery") {
        console.log("Using hash-based recovery tokens");
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session from recovery tokens:", error);
            setSessionError(error.message);
            toast.error("Invalid or expired reset link. Please request a new one.");
            redirectToLogin();
            return;
          }

          if (data.session) {
            setIsValidSession(true);
            console.log("Password reset session established from hash tokens");
            return;
          }
        } catch (err) {
          console.error("Unexpected error setting session:", err);
          setSessionError("An unexpected error occurred");
          toast.error("An unexpected error occurred. Please try again.");
          return;
        }
      }

      // Handle PKCE code-based session
      if (code) {
        console.log("Using PKCE code exchange");
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Error exchanging code for session:", error);
            setSessionError(error.message);
            toast.error("Invalid or expired reset link. Please request a new one.");
            redirectToLogin();
            return;
          }

          if (data.session) {
            setIsValidSession(true);
            console.log("Password reset session established from PKCE code");
            return;
          }
        } catch (err) {
          console.error("Unexpected error exchanging code:", err);
          setSessionError("An unexpected error occurred");
          toast.error("An unexpected error occurred. Please try again.");
          return;
        }
      }

      // No valid parameters found
      console.error("No valid reset parameters found");
      toast.error("Invalid or expired reset link");
      redirectToLogin();
    };

    const redirectToLogin = () => {
      setTimeout(() => {
        const from = searchParams.get("from");
        if (from === "manufacturer") {
          router.push("/auth/manufacturer");
        } else if (from === "distributor") {
          router.push("/auth/distributor");
        } else if (from === "brand") {
          router.push("/auth/brand");
        } else {
          router.push("/");
        }
      }, 3000);
    };

    establishSession();
  }, [searchParams, router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession && sessionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-4">
              This password reset link is invalid or has expired.
            </p>
            {sessionError && (
              <p className="text-sm text-red-600 mb-4">
                Error: {sessionError}
              </p>
            )}
            <Button onClick={() => router.push("/auth/brand")}>
              Request New Reset Link
            </Button>
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
              Password Updated!
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your password has been successfully updated. Redirecting to
              dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-lg sm:mx-auto mx-3">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Set New Password
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                minLength={6}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full"
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
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
                Please wait while we verify your reset link.
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
