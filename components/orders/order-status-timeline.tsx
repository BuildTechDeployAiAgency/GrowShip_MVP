"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, XCircle } from "lucide-react";
import type { OrderStatus } from "@/types/orders";
import { ORDER_STATUS_FLOW, isValidStatusTransition } from "@/lib/orders/status-workflow";

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  onStatusClick: (status: OrderStatus) => void;
  disabled?: boolean;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; description: string }
> = {
  pending: {
    label: "Pending",
    description: "Order received",
  },
  processing: {
    label: "Processing",
    description: "Preparing order",
  },
  shipped: {
    label: "Shipped",
    description: "In transit",
  },
  delivered: {
    label: "Delivered",
    description: "Order complete",
  },
  cancelled: {
    label: "Cancelled",
    description: "Order cancelled",
  },
};

export function OrderStatusTimeline({
  currentStatus,
  onStatusClick,
  disabled = false,
}: OrderStatusTimelineProps) {
  // If cancelled, show a different view
  if (currentStatus === "cancelled") {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-center gap-3">
          <XCircle className="h-6 w-6 text-red-500" />
          <div>
            <p className="font-medium text-red-700">Order Cancelled</p>
            <p className="text-sm text-red-600">This order has been cancelled and cannot be updated.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* Progress line background */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full mx-8" />
        
        {/* Progress line filled */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-500 rounded-full mx-8 transition-all duration-500"
          style={{
            width: `calc(${(currentIndex / (ORDER_STATUS_FLOW.length - 1)) * 100}% - 4rem)`,
          }}
        />

        {/* Status nodes */}
        {ORDER_STATUS_FLOW.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const canTransition = isValidStatusTransition(currentStatus, status) && status !== currentStatus;

          return (
            <div
              key={status}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Node */}
              <button
                type="button"
                onClick={() => canTransition && !disabled && onStatusClick(status)}
                disabled={!canTransition || disabled}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  // Completed states
                  isCompleted && "bg-teal-500 border-teal-500 text-white",
                  // Current state
                  isCurrent && "bg-white border-teal-500 ring-4 ring-teal-100",
                  // Future states
                  isFuture && "bg-white border-gray-300",
                  // Clickable next state
                  canTransition && !disabled && "cursor-pointer hover:border-teal-400 hover:bg-teal-50 hover:scale-110",
                  // Disabled/non-clickable
                  (!canTransition || disabled) && !isCompleted && !isCurrent && "cursor-not-allowed opacity-60"
                )}
                title={
                  canTransition
                    ? `Click to update status to ${statusConfig[status].label}`
                    : isCompleted
                    ? `${statusConfig[status].label} - Completed`
                    : isCurrent
                    ? `${statusConfig[status].label} - Current`
                    : `${statusConfig[status].label} - Not available yet`
                }
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Circle
                    className={cn(
                      "h-4 w-4",
                      isCurrent && "fill-teal-500 text-teal-500",
                      isFuture && "text-gray-400"
                    )}
                  />
                )}
                
                {/* Pulse animation for next available status */}
                {canTransition && !disabled && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-teal-400 opacity-20" />
                )}
              </button>

              {/* Label */}
              <div className="mt-3 text-center">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted && "text-teal-600",
                    isCurrent && "text-teal-700 font-semibold",
                    isFuture && "text-gray-500"
                  )}
                >
                  {statusConfig[status].label}
                </p>
                <p
                  className={cn(
                    "text-xs mt-0.5 hidden sm:block",
                    isCompleted && "text-teal-500",
                    isCurrent && "text-teal-600",
                    isFuture && "text-gray-400"
                  )}
                >
                  {statusConfig[status].description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

