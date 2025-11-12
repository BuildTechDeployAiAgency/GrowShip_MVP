import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CalendarEvent {
  id: string;
  brand_id: string;
  event_type: "payment_due" | "po_approval_due" | "shipment_arrival" | "pop_upload_due" | "custom";
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  is_all_day: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface UseCalendarEventsOptions {
  startDate?: string;
  endDate?: string;
  eventType?: string;
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

  return {
    events: (data?.events || []) as CalendarEvent[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    createEvent: createEventMutation.mutateAsync,
  };
}


