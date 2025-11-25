import { PurchaseOrderLine, StockStatus, StockValidationResult } from "@/types/purchase-orders";

/**
 * Evaluate if a line item can be approved based on stock
 */
export function evaluateLineApproval(
  line: PurchaseOrderLine,
  availableStock: number
): {
  canApprove: boolean;
  requiresOverride: boolean;
  suggestion?: {
    type: "split" | "reduce" | "override";
    approvedQty?: number;
    backorderQty?: number;
    message: string;
  };
} {
  const requestedQty = line.requested_qty || line.quantity;

  // Case 1: Sufficient stock - can approve
  if (availableStock >= requestedQty) {
    return {
      canApprove: true,
      requiresOverride: false,
    };
  }

  // Case 2: Partial stock - suggest split
  if (availableStock > 0) {
    return {
      canApprove: false,
      requiresOverride: false,
      suggestion: {
        type: "split",
        approvedQty: availableStock,
        backorderQty: requestedQty - availableStock,
        message: `Split: ${availableStock} available now, ${
          requestedQty - availableStock
        } on backorder`,
      },
    };
  }

  // Case 3: No stock - require override
  return {
    canApprove: false,
    requiresOverride: true,
    suggestion: {
      type: "override",
      message: "No stock available. Override required to approve.",
    },
  };
}

/**
 * Calculate backorder quantity
 */
export function calculateBackorder(
  requested: number,
  available: number,
  approved: number
): number {
  // Backorder is what's left after approval
  const remaining = requested - approved;
  return Math.max(0, remaining);
}

/**
 * Check if auto-split suggestion applies
 */
export function canAutoSplit(
  line: PurchaseOrderLine,
  availableStock: number
): boolean {
  const requestedQty = line.requested_qty || line.quantity;
  return availableStock > 0 && availableStock < requestedQty;
}

/**
 * Validate approval decision
 */
export function validateApprovalDecision(
  requestedQty: number,
  approvedQty: number,
  backorderQty: number,
  rejectedQty: number,
  availableStock: number,
  overrideApplied: boolean
): { valid: boolean; error?: string } {
  // Check total equals requested
  const total = approvedQty + backorderQty + rejectedQty;
  if (Math.abs(total - requestedQty) > 0.001) {
    return {
      valid: false,
      error: `Total quantities (${total}) must equal requested quantity (${requestedQty})`,
    };
  }

  // Check non-negative
  if (approvedQty < 0 || backorderQty < 0 || rejectedQty < 0) {
    return {
      valid: false,
      error: "Quantities cannot be negative",
    };
  }

  // Check approved doesn't exceed stock (unless override)
  if (!overrideApplied && approvedQty > availableStock) {
    return {
      valid: false,
      error: `Approved quantity (${approvedQty}) exceeds available stock (${availableStock}). Use override to proceed.`,
    };
  }

  return { valid: true };
}

/**
 * Generate auto-split decision
 */
export function generateAutoSplitDecision(
  line: PurchaseOrderLine,
  availableStock: number
): {
  approvedQty: number;
  backorderQty: number;
  rejectedQty: number;
} {
  const requestedQty = line.requested_qty || line.quantity;

  if (availableStock >= requestedQty) {
    return {
      approvedQty: requestedQty,
      backorderQty: 0,
      rejectedQty: 0,
    };
  }

  if (availableStock > 0) {
    return {
      approvedQty: availableStock,
      backorderQty: requestedQty - availableStock,
      rejectedQty: 0,
    };
  }

  return {
    approvedQty: 0,
    backorderQty: requestedQty,
    rejectedQty: 0,
  };
}

/**
 * Calculate fulfillment percentage for PO
 */
export function calculateFulfillmentPercentage(
  totalRequested: number,
  totalApproved: number
): number {
  if (totalRequested === 0) return 0;
  return Math.round((totalApproved / totalRequested) * 100);
}

/**
 * Determine overall PO status based on line statuses
 */
export function determinePOStatus(
  lines: PurchaseOrderLine[]
): "approved" | "partially_approved" | "rejected" {
  if (lines.length === 0) return "rejected";

  const allApproved = lines.every(
    (line) => line.line_status === "approved"
  );

  const allRejected = lines.every(
    (line) => line.line_status === "rejected" || line.line_status === "cancelled"
  );

  if (allApproved) return "approved";
  if (allRejected) return "rejected";
  return "partially_approved";
}

/**
 * Get stock status color for UI
 */
export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case "sufficient":
      return "green";
    case "partial":
      return "yellow";
    case "insufficient":
      return "red";
    default:
      return "gray";
  }
}

