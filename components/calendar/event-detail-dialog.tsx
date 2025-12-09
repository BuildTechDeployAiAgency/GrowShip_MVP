"use client";

import { useState } from "react";
import { CalendarEvent } from "@/hooks/use-calendar-events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Package,
  FileText,
  DollarSign,
  Megaphone,
  Truck,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
}

const eventTypeConfig = {
  payment_due: {
    label: "Payment Due",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: DollarSign,
  },
  po_approval_due: {
    label: "PO Approval Due",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: FileText,
  },
  shipment_arrival: {
    label: "Shipment Arrival",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: Package,
  },
  pop_upload_due: {
    label: "POP Upload Due",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: ClipboardCheck,
  },
  delivery_milestone: {
    label: "Delivery Milestone",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    icon: Truck,
  },
  compliance_review: {
    label: "Compliance Review",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: ClipboardCheck,
  },
  campaign_start: {
    label: "Campaign Start",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    icon: Megaphone,
  },
  campaign_end: {
    label: "Campaign End",
    color: "bg-pink-100 text-pink-800 border-pink-200",
    icon: Megaphone,
  },
  backorder_review: {
    label: "Backorder Review",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: Package,
  },
  custom: {
    label: "Custom",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: Calendar,
  },
};

const statusConfig = {
  upcoming: {
    label: "Upcoming",
    color: "bg-blue-100 text-blue-800",
  },
  done: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100 text-red-800",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
  },
};

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onUpdateEvent,
}: EventDetailDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!event) return null;

  const typeConfig = eventTypeConfig[event.event_type] || eventTypeConfig.custom;
  const TypeIcon = typeConfig.icon;
  const statusInfo = statusConfig[event.status] || statusConfig.upcoming;

  const eventDate = new Date(event.event_date);
  const isPast = eventDate < new Date();
  const isToday = format(eventDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const getEntityLink = () => {
    if (!event.related_entity_type || !event.related_entity_id) return null;

    // Note: Some pages have detail views (po, shipment, distributor), others only have lists
    // For list-only pages, we link to the list page - future enhancement could add highlighting
    const linkMap: Record<string, string> = {
      invoice: `/invoices`, // Invoices page is list-only, no detail view
      po: `/purchase-orders/${event.related_entity_id}`,
      shipment: `/shipments/${event.related_entity_id}`,
      campaign: `/marketing`, // Marketing page is placeholder, no detail view yet
      distributor: `/distributors/${event.related_entity_id}`,
    };

    return linkMap[event.related_entity_type] || null;
  };

  const entityLink = getEntityLink();

  const handleMarkAsDone = async () => {
    if (!onUpdateEvent) return;

    setIsUpdating(true);
    try {
      await onUpdateEvent(event.id, { status: "done" });
      toast.success("Event marked as completed");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsCancelled = async () => {
    if (!onUpdateEvent) return;

    setIsUpdating(true);
    try {
      await onUpdateEvent(event.id, { status: "cancelled" });
      toast.success("Event cancelled");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={typeConfig.color}>
                    {typeConfig.label}
                  </Badge>
                  <Badge variant="outline" className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                  {isToday && (
                    <Badge variant="secondary" className="text-xs">
                      Today
                    </Badge>
                  )}
                  {isPast && event.status === "upcoming" && (
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date and Time */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium">{format(eventDate, "MMM dd, yyyy")}</p>
                  </div>
                </div>
                {event.event_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="font-medium">
                        {format(new Date(`2000-01-01T${event.event_time}`), "h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Linked Entity */}
          {entityLink && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Related Record</h4>
              <Link href={entityLink}>
                <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-50 rounded-lg">
                        <ExternalLink className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          View {event.related_entity_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          Click to open related record
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          {/* Completion Info */}
          {event.completed_at && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Completion Details</h4>
              <p className="text-sm text-gray-600">
                Completed on {format(new Date(event.completed_at), "MMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}

          {/* Cancellation Info */}
          {event.cancelled_at && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Cancellation Details</h4>
              <p className="text-sm text-gray-600">
                Cancelled on {format(new Date(event.cancelled_at), "MMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {event.status === "upcoming" && onUpdateEvent && (
              <>
                <Button
                  onClick={handleMarkAsDone}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Done
                </Button>
                <Button
                  onClick={handleMarkAsCancelled}
                  disabled={isUpdating}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Event
                </Button>
              </>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

