"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { EnhancedAuthProvider } from "@/contexts/enhanced-auth-context";
import { CalendarView } from "@/components/calendar/calendar-view";
import { WeekView } from "@/components/calendar/week-view";
import { EventList } from "@/components/calendar/event-list";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { useCalendarEvents, CalendarEvent, CalendarEventType, CalendarEventStatus } from "@/hooks/use-calendar-events";
import { Plus, RefreshCw, Calendar as CalendarIcon, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = "month" | "week" | "list";

export default function CalendarPage() {
  const { user, profile, loading } = useRequireProfile();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Filter states
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [distributorFilter, setDistributorFilter] = useState<string>("all");

  // Calculate date range based on view mode
  const getDateRange = () => {
    if (viewMode === "month") {
      return {
        startDate: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        endDate: format(endOfMonth(currentDate), "yyyy-MM-dd"),
      };
    } else if (viewMode === "week") {
      return {
        startDate: format(startOfWeek(currentDate, { weekStartsOn: 0 }), "yyyy-MM-dd"),
        endDate: format(endOfWeek(currentDate, { weekStartsOn: 0 }), "yyyy-MM-dd"),
      };
    } else {
      // List view - show current month
      return {
        startDate: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        endDate: format(endOfMonth(currentDate), "yyyy-MM-dd"),
      };
    }
  };

  const { startDate, endDate } = getDateRange();

  const { events, isLoading, refetch, updateEvent, isUpdating } = useCalendarEvents({
    startDate,
    endDate,
    eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as CalendarEventStatus) : undefined,
    distributorId: distributorFilter !== "all" ? distributorFilter : undefined,
  });

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

      const { created, updated, cancelled } = result.data;
      const total = created + updated;
      
      if (total > 0 || cancelled > 0) {
        toast.success(
          `Synced calendar events: ${created} created, ${updated} updated${cancelled > 0 ? `, ${cancelled} cancelled` : ""}`
        );
        refetch();
      } else {
        toast.info("No new events to sync");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sync events");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(true);
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    await updateEvent({ id: eventId, ...updates });
    refetch();
  };

  return (
    <EnhancedAuthProvider>
      <ProtectedPage allowedStatuses={["approved"]}>
        <MainLayout
          pageTitle="Calendar"
          pageSubtitle="View and manage events and deadlines"
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
          <div className="space-y-4">
            {/* View Mode Selector and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* View Mode Toggle */}
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                    <TabsList>
                      <TabsTrigger value="month" className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Month
                      </TabsTrigger>
                      <TabsTrigger value="week" className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Week
                      </TabsTrigger>
                      <TabsTrigger value="list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        List
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Event Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="payment_due">Payment Due</SelectItem>
                        <SelectItem value="po_approval_due">PO Approval</SelectItem>
                        <SelectItem value="shipment_arrival">Shipment Arrival</SelectItem>
                        <SelectItem value="delivery_milestone">Delivery Milestone</SelectItem>
                        <SelectItem value="pop_upload_due">POP Upload</SelectItem>
                        <SelectItem value="compliance_review">Compliance Review</SelectItem>
                        <SelectItem value="campaign_start">Campaign Start</SelectItem>
                        <SelectItem value="campaign_end">Campaign End</SelectItem>
                        <SelectItem value="backorder_review">Backorder Review</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="done">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Views */}
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === "month" && (
                  <CalendarView
                    events={events}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onEventClick={handleEventClick}
                  />
                )}

                {viewMode === "week" && (
                  <WeekView
                    events={events}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onEventClick={handleEventClick}
                  />
                )}

                {viewMode === "list" && <EventList />}
              </>
            )}
          </div>

          {/* Event Form Dialog */}
          <EventFormDialog
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            event={null}
            onSuccess={() => {
              setIsFormOpen(false);
              refetch();
            }}
          />

          {/* Event Detail Dialog */}
          <EventDetailDialog
            event={selectedEvent}
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
            onUpdateEvent={handleUpdateEvent}
          />
        </MainLayout>
      </ProtectedPage>
    </EnhancedAuthProvider>
  );
}
