import { OrderStatus } from "@/types/orders";

/**
 * Valid order status flow: pending -> processing -> shipped -> delivered
 * 
 * Stock Impact:
 * - pending: No inventory impact (order created but not confirmed)
 * - processing: Stock is ALLOCATED (reserved) - reduces available stock
 * - shipped: Stock is DEDUCTED (consumed) - reduces on-hand stock
 * - delivered: No inventory impact (confirmation of receipt)
 * - cancelled: Stock is RELEASED (if was allocated/deducted)
 */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
];

/**
 * Map of allowed status transitions.
 * Each status can only move to the next status(es) in the workflow.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [], // Terminal state, no further transitions
  cancelled: [], // Terminal state, no further transitions
};

/**
 * Check if a status transition is valid.
 * @param currentStatus - The current order status
 * @param newStatus - The desired new status
 * @returns true if the transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  // Allow staying in the same status (e.g. updating other fields)
  if (currentStatus === newStatus) return true;

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

/**
 * Get the next valid status(es) for the current status.
 * @param currentStatus - The current order status
 * @returns Array of valid next statuses
 */
export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Get the display label for a status.
 * @param status - The order status
 * @returns Capitalized status label
 */
export function getStatusLabel(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

