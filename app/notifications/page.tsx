"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { NotificationsManagement } from "@/components/notifications/notifications-management";

export default function NotificationsPage() {
  const { user, profile, loading } = useRequireProfile();

  if (loading) {
    return (
      <MainLayout pageTitle="Notifications" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <NotificationsManagement />
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}