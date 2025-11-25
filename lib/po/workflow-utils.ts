export type POStatus = "draft" | "submitted" | "approved" | "rejected" | "ordered" | "received" | "cancelled";
export type POAction = "submit" | "approve" | "reject" | "cancel" | "order" | "receive";

export interface WorkflowTransition {
  from: POStatus;
  to: POStatus;
  action: POAction;
  requiresApproval?: boolean;
  allowedRoles?: string[];
}

const VALID_TRANSITIONS: WorkflowTransition[] = [
  { from: "draft", to: "submitted", action: "submit" },
  { from: "submitted", to: "approved", action: "approve", requiresApproval: true },
  { from: "submitted", to: "rejected", action: "reject", requiresApproval: true },
  { from: "approved", to: "ordered", action: "order" },
  { from: "ordered", to: "received", action: "receive" },
  { from: "draft", to: "cancelled", action: "cancel" },
  { from: "submitted", to: "cancelled", action: "cancel" },
  { from: "approved", to: "cancelled", action: "cancel" },
  { from: "ordered", to: "cancelled", action: "cancel" },
];

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
  currentStatus: POStatus,
  targetStatus: POStatus,
  action: POAction
): boolean {
  return VALID_TRANSITIONS.some(
    (transition) =>
      transition.from === currentStatus &&
      transition.to === targetStatus &&
      transition.action === action
  );
}

/**
 * Get available actions for a PO status
 */
export function getAvailableActions(status: POStatus): POAction[] {
  return VALID_TRANSITIONS
    .filter((transition) => transition.from === status)
    .map((transition) => transition.action);
}

/**
 * Get next status for an action
 */
export function getNextStatus(status: POStatus, action: POAction): POStatus | null {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === status && t.action === action
  );
  return transition?.to || null;
}

