import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type CalendarEventType = 
  | "payment_due"
  | "po_approval_due"
  | "shipment_arrival"
  | "pop_upload_due"
  | "delivery_milestone"
  | "compliance_review"
  | "campaign_start"
  | "campaign_end"
  | "backorder_review"
  | "custom";

export type CalendarEventStatus = "upcoming" | "done" | "overdue" | "cancelled";

export interface CalendarEvent {
  id: string;
  brand_id: string;
  distributor_id?: string;
  event_type: CalendarEventType;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_all_day: boolean;
  status: CalendarEventStatus;
  created_by?: string;
  completed_at?: string;
  completed_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  created_at: string;
  updated_at: string;
}

interface UseCalendarEventsOptions {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  distributorId?: string;
  status?: CalendarEventStatus;
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["calendar-events", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.startDate) params.append("start_date", options.startDate);
      if (options.endDate) params.append("end_date", options.endDate);
      if (options.eventType) params.append("event_type", options.eventType);
      if (options.distributorId) params.append("distributor_id", options.distributorId);
      if (options.status) params.append("status", options.status);

      const response = await fetch(`/api/calendar/events?${params}`);
      if (!response.ok) throw new Error("Failed to fetch calendar events");
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: Partial<CalendarEvent>) => {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create event");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (event: Partial<CalendarEvent> & { id: string }) => {
      const response = await fetch("/api/calendar/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update event");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/calendar/events?id=${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete event");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  return {
    events: (data?.events || []) as CalendarEvent[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    createEvent: createEventMutation.mutateAsync,
    updateEvent: updateEventMutation.mutateAsync,
    deleteEvent: deleteEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
}
