"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarEvents, CalendarEvent } from "@/hooks/use-calendar-events";
import { toast } from "react-toastify";

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onSuccess: () => void;
}

export function EventFormDialog({
  open,
  onClose,
  event,
  onSuccess,
}: EventFormDialogProps) {
  const [eventType, setEventType] = useState<CalendarEvent["event_type"]>("custom");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const { createEvent } = useCalendarEvents();

  useEffect(() => {
    if (event) {
      setEventType(event.event_type);
      setTitle(event.title);
      setDescription(event.description || "");
      setEventDate(event.event_date);
      setEventTime(event.event_time || "");
      setIsAllDay(event.is_all_day);
    } else {
      resetForm();
    }
  }, [event, open]);

  const resetForm = () => {
    setEventType("custom");
    setTitle("");
    setDescription("");
    setEventDate("");
    setEventTime("");
    setIsAllDay(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !eventDate) {
      toast.error("Title and event date are required");
      return;
    }

    try {
      await createEvent({
        event_type: eventType,
        title,
        description: description || undefined,
        event_date: eventDate,
        event_time: isAllDay ? undefined : eventTime,
        is_all_day: isAllDay,
      });

      toast.success("Event created successfully");
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add an event to your calendar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select value={eventType} onValueChange={(v: any) => setEventType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_due">Payment Due</SelectItem>
                  <SelectItem value="po_approval_due">PO Approval Due</SelectItem>
                  <SelectItem value="shipment_arrival">Shipment Arrival</SelectItem>
                  <SelectItem value="pop_upload_due">POP Upload Due</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter event description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="event_date">Event Date *</Label>
              <Input
                id="event_date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="mr-2"
                />
                All Day Event
              </Label>
            </div>
            {!isAllDay && (
              <div>
                <Label htmlFor="event_time">Event Time</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


