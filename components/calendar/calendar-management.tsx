"use client";

import { useState } from "react";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/main-layout";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  attendees?: string[];
  type: "meeting" | "deadline" | "event";
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Meeting",
    date: "2024-01-20",
    time: "10:00 AM",
    location: "Conference Room A",
    attendees: ["John Doe", "Jane Smith"],
    type: "meeting",
  },
  {
    id: "2",
    title: "Order Deadline",
    date: "2024-01-25",
    time: "5:00 PM",
    type: "deadline",
  },
  {
    id: "3",
    title: "Product Launch",
    date: "2024-02-01",
    time: "2:00 PM",
    location: "Main Office",
    type: "event",
  },
];

const typeConfig = {
  meeting: { label: "Meeting", color: "bg-blue-100 text-blue-800" },
  deadline: { label: "Deadline", color: "bg-red-100 text-red-800" },
  event: { label: "Event", color: "bg-green-100 text-green-800" },
};

export function CalendarManagement() {
  const { profile } = useEnhancedAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const filteredEvents = mockEvents.filter((event) => event.date === selectedDate);

  return (
    <MainLayout
      pageTitle="Calendar"
      pageSubtitle="Manage events and deadlines"
      actions={
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Calendar View Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="h-96 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              Calendar widget placeholder - Full calendar view with month/week/day views
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No events scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {event.time}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </div>
                            )}
                            {event.attendees && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {event.attendees.length} attendees
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={typeConfig[event.type].color}>
                          {typeConfig[event.type].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}