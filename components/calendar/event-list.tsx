"use client";

import { useState } from "react";
import { useCalendarEvents, CalendarEvent } from "@/hooks/use-calendar-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const eventTypeColors: Record<string, string> = {
  payment_due: "bg-blue-100 text-blue-800 border-blue-200",
  po_approval_due: "bg-orange-100 text-orange-800 border-orange-200",
  shipment_arrival: "bg-green-100 text-green-800 border-green-200",
  pop_upload_due: "bg-purple-100 text-purple-800 border-purple-200",
  custom: "bg-gray-100 text-gray-800 border-gray-200",
};

const eventTypeLabels: Record<string, string> = {
  payment_due: "Payment Due",
  po_approval_due: "PO Approval Due",
  shipment_arrival: "Shipment Arrival",
  pop_upload_due: "POP Upload Due",
  custom: "Custom",
};

export function EventList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");

  // Get events for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { events, isLoading } = useCalendarEvents({
    startDate: format(monthStart, "yyyy-MM-dd"),
    endDate: format(monthEnd, "yyyy-MM-dd"),
    eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
  });

  const filteredEvents = events.filter((event: CalendarEvent) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    return dateA.getTime() - dateB.getTime();
  });

  const getEventLink = (event: CalendarEvent) => {
    if (event.related_entity_type === "invoice" && event.related_entity_id) {
      return `/invoices/${event.related_entity_id}`;
    }
    if (event.related_entity_type === "po" && event.related_entity_id) {
      return `/purchase-orders/${event.related_entity_id}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Events</CardTitle>
          <Badge variant="outline">{sortedEvents.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment_due">Payment Due</SelectItem>
                <SelectItem value="po_approval_due">PO Approval</SelectItem>
                <SelectItem value="shipment_arrival">Shipment Arrival</SelectItem>
                <SelectItem value="pop_upload_due">POP Upload</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events List */}
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-600">
                {searchTerm || eventTypeFilter !== "all"
                  ? "No events match your filters"
                  : "No events scheduled for this period"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEvents.map((event: CalendarEvent) => {
                const eventLink = getEventLink(event);
                const eventDate = new Date(event.event_date);
                const isPast = eventDate < new Date();
                const isToday = format(eventDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                const EventContent = (
                  <div
                    className={`p-4 border rounded-lg transition-colors ${
                      eventTypeColors[event.event_type] || eventTypeColors.custom
                    } ${isPast ? "opacity-60" : ""} ${isToday ? "ring-2 ring-teal-500" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{event.title}</h4>
                          {isToday && (
                            <Badge variant="secondary" className="text-xs">
                              Today
                            </Badge>
                          )}
                          {isPast && (
                            <Badge variant="outline" className="text-xs">
                              Past
                            </Badge>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>{format(eventDate, "MMM dd, yyyy")}</span>
                          {event.event_time && (
                            <span>{format(new Date(`2000-01-01T${event.event_time}`), "h:mm a")}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-2 text-xs capitalize"
                      >
                        {eventTypeLabels[event.event_type] || event.event_type}
                      </Badge>
                    </div>
                  </div>
                );

                if (eventLink) {
                  return (
                    <Link key={event.id} href={eventLink}>
                      {EventContent}
                    </Link>
                  );
                }

                return <div key={event.id}>{EventContent}</div>;
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

