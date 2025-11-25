"use client";

import { useState } from "react";
import { useCalendarEvents, CalendarEvent } from "@/hooks/use-calendar-events";
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const eventTypeColors: Record<string, string> = {
  payment_due: "bg-blue-100 text-blue-800",
  po_approval_due: "bg-orange-100 text-orange-800",
  shipment_arrival: "bg-green-100 text-green-800",
  pop_upload_due: "bg-purple-100 text-purple-800",
  delivery_milestone: "bg-teal-100 text-teal-800",
  compliance_review: "bg-yellow-100 text-yellow-800",
  campaign_start: "bg-pink-100 text-pink-800",
  campaign_end: "bg-pink-100 text-pink-800",
  backorder_review: "bg-red-100 text-red-800",
  custom: "bg-gray-100 text-gray-800",
};

export function CalendarView({ events, currentDate, onDateChange, onEventClick }: CalendarViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event: CalendarEvent) =>
      isSameDay(new Date(event.event_date), day)
    );
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isPast = day < new Date() && !isToday;
            
            return (
              <div
                key={day.toISOString()}
                className={`aspect-square border rounded-lg p-1 ${
                  isToday ? "bg-teal-50 border-teal-300" : "border-gray-200"
                } ${isPast ? "bg-gray-50" : ""}`}
              >
                <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event: CalendarEvent) => (
                    <Badge
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={`text-xs w-full justify-start cursor-pointer hover:opacity-80 transition-opacity ${
                        eventTypeColors[event.event_type] || "bg-gray-100"
                      } ${event.status === "done" ? "opacity-60" : ""} ${
                        event.status === "cancelled" ? "opacity-40 line-through" : ""
                      }`}
                      title={event.title}
                    >
                      {event.title.substring(0, 10)}
                    </Badge>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 pl-1">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
