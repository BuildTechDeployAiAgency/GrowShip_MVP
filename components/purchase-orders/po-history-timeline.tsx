"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Package, Truck, FileText, User } from "lucide-react";
import { Loader2 } from "lucide-react";

interface ApprovalHistoryEntry {
  id: string;
  po_id: string;
  action: "submitted" | "approved" | "rejected" | "cancelled" | "ordered" | "received";
  actor_id: string;
  comments?: string;
  created_at: string;
  actor?: {
    user_id: string;
    contact_name?: string;
    company_name?: string;
    email?: string;
  };
}

interface POHistoryTimelineProps {
  poId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  submitted: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
  ordered: <Package className="h-4 w-4" />,
  received: <Truck className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  ordered: "bg-purple-100 text-purple-800 border-purple-200",
  received: "bg-teal-100 text-teal-800 border-teal-200",
};

export function POHistoryTimeline({ poId }: POHistoryTimelineProps) {
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/purchase-orders/${poId}/history`);
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }
        const result = await response.json();
        setHistory(result.history || []);
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    if (poId) {
      fetchHistory();
    }
  }, [poId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">No history available for this purchase order.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {history.map((entry, index) => (
              <div key={entry.id} className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    actionColors[entry.action] || actionColors.submitted
                  }`}
                >
                  {actionIcons[entry.action] || <FileText className="h-4 w-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={actionColors[entry.action] || actionColors.submitted}
                    >
                      {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {format(new Date(entry.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Actor */}
                  {entry.actor && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>
                        {entry.actor.contact_name ||
                          entry.actor.company_name ||
                          entry.actor.email ||
                          "Unknown User"}
                      </span>
                    </div>
                  )}

                  {/* Comments */}
                  {entry.comments && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{entry.comments}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

