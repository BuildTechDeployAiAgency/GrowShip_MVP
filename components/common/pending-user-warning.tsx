"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function PendingUserWarningContent() {
  const [showWarning, setShowWarning] = useState(false);
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Show warning if user is pending or if warning param is present
    const warningParam = searchParams.get("warning");
    if (profile?.user_status === "pending" || warningParam === "pending") {
      setShowWarning(true);
    }
  }, [profile?.user_status, searchParams]);

  if (!showWarning || profile?.user_status !== "pending") {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            <strong>Account Pending Approval:</strong> Your account is currently
            pending approval. You can only access the dashboard until your
            account is approved by an administrator.
          </p>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWarning(false)}
              className="text-yellow-500 hover:text-yellow-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PendingUserWarning() {
  return (
    <Suspense fallback={null}>
      <PendingUserWarningContent />
    </Suspense>
  );
}
