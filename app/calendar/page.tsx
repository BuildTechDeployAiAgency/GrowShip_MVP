"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { CalendarView } from "@/components/calendar/calendar-view";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export default function CalendarPage() {
  const { user, profile, loading } = useRequireProfile();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (loading) {
    return (
      <MainLayout pageTitle="Calendar" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  const handleSyncEvents = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/calendar/auto-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_id: profile?.brand_id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to sync events");
      }

      const { created, updated, deleted } = result.data;
      const total = created + updated;
      
      if (total > 0 || deleted > 0) {
        toast.success(
          `Synced calendar events: ${created} created, ${updated} updated${deleted > 0 ? `, ${deleted} deleted` : ""}`
        );
        // Refresh calendar view
        window.location.reload();
      } else {
        toast.info("No new events to sync");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sync events");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <MainLayout
          pageTitle="Calendar"
          pageSubtitle="View events and deadlines"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSyncEvents}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                Sync Events
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </div>
          }
        >
          <CalendarView />
          <EventFormDialog
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            event={null}
            onSuccess={() => setIsFormOpen(false)}
          />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}

