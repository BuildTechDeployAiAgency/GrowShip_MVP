"use client";

import { useState } from "react";
import { CalendarEvent } from "@/hooks/use-calendar-events";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const eventTypeColors: Record<string, string> = {
  payment_due: "bg-blue-100 text-blue-800 border-blue-200",
  po_approval_due: "bg-orange-100 text-orange-800 border-orange-200",
  shipment_arrival: "bg-green-100 text-green-800 border-green-200",
  pop_upload_due: "bg-purple-100 text-purple-800 border-purple-200",
  delivery_milestone: "bg-teal-100 text-teal-800 border-teal-200",
  compliance_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  campaign_start: "bg-pink-100 text-pink-800 border-pink-200",
  campaign_end: "bg-pink-100 text-pink-800 border-pink-200",
  backorder_review: "bg-red-100 text-red-800 border-red-200",
  custom: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusStyles: Record<string, string> = {
  upcoming: "border-l-4 border-l-blue-500",
  done: "border-l-4 border-l-green-500 opacity-70",
  overdue: "border-l-4 border-l-red-500",
  cancelled: "border-l-4 border-l-gray-400 opacity-50 line-through",
};

export function WeekView({ events, currentDate, onDateChange, onEventClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event: CalendarEvent) =>
      isSameDay(new Date(event.event_date), day)
    ).sort((a, b) => {
      // Sort by time if available, otherwise by title
      if (a.event_time && b.event_time) {
        return a.event_time.localeCompare(b.event_time);
      }
      return a.title.localeCompare(b.title);
    });
  };

  const handlePrevWeek = () => {
    onDateChange(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    onDateChange(addWeeks(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Week Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isPast = day < new Date() && !isToday;

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg p-3 min-h-[200px] ${
                  isToday ? "bg-teal-50 border-teal-300" : "border-gray-200"
                } ${isPast ? "bg-gray-50" : "bg-white"}`}
              >
                {/* Day Header */}
                <div className="mb-2 pb-2 border-b">
                  <div className="text-xs font-semibold text-gray-500">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      isToday ? "text-teal-600" : "text-gray-900"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {/* Events List */}
                <div className="space-y-2">
                  {dayEvents.map((event: CalendarEvent) => {
                    const isPastEvent = new Date(event.event_date) < new Date() && !isToday;
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`p-2 rounded border cursor-pointer hover:shadow-md transition-all ${
                          eventTypeColors[event.event_type] || eventTypeColors.custom
                        } ${statusStyles[event.status] || ""}`}
                        title={event.description || event.title}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          {event.event_time && (
                            <span className="text-xs font-semibold">
                              {format(new Date(`2000-01-01T${event.event_time}`), "h:mm a")}
                            </span>
                          )}
                          {event.status === "done" && (
                            <Badge variant="secondary" className="text-xs h-4 px-1">
                              ✓
                            </Badge>
                          )}
                          {event.status === "overdue" && (
                            <Badge variant="destructive" className="text-xs h-4 px-1">
                              !
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium leading-tight line-clamp-2">
                          {event.title}
                        </p>
                      </div>
                    );
                  })}

                  {/* Empty State */}
                  {dayEvents.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400">No events</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-4 border-l-blue-500 bg-white"></div>
              <span className="text-gray-600">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-4 border-l-green-500 bg-white"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-4 border-l-red-500 bg-white"></div>
              <span className="text-gray-600">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-4 border-l-gray-400 bg-white"></div>
              <span className="text-gray-600">Cancelled</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

