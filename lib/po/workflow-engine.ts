import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

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

/**
 * Check if user has permission to perform action
 */
export async function checkPermission(
  userId: string,
  poId: string,
  action: POAction
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // Get PO details
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("user_id, brand_id, po_status")
    .eq("id", poId)
    .single();

  if (poError || !po) {
    return { allowed: false, reason: "Purchase order not found" };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role_name, brand_id")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: "User profile not found" };
  }

  // Check brand access
  const isSuperAdmin = profile.role_name === "super_admin";
  if (!isSuperAdmin && profile.brand_id !== po.brand_id) {
    return { allowed: false, reason: "You do not have access to this brand" };
  }

  // Check if action requires approval and user has permission
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === po.po_status && t.action === action
  );

  if (!transition) {
    return { allowed: false, reason: "Invalid transition" };
  }

  if (transition.requiresApproval) {
    // Check if user is not the creator (can't approve own PO)
    if (po.user_id === userId) {
      return { allowed: false, reason: "You cannot approve your own purchase order" };
    }

    // Check role permissions (could be enhanced with role-based checks)
    const allowedRoles = transition.allowedRoles || ["brand_admin", "super_admin"];
    if (!isSuperAdmin && !allowedRoles.includes(profile.role_name)) {
      return { allowed: false, reason: "You do not have permission to approve purchase orders" };
    }
  }

  return { allowed: true };
}

/**
 * Execute workflow transition
 */
export async function executeTransition(
  poId: string,
  userId: string,
  action: POAction,
  comments?: string
): Promise<{ success: boolean; error?: string; updatedPO?: any }> {
  const supabase = createAdminClient();

  // Get current PO status
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("id", poId)
    .single();

  if (poError || !po) {
    return { success: false, error: "Purchase order not found" };
  }

  // Validate transition
  const nextStatus = getNextStatus(po.po_status as POStatus, action);
  if (!nextStatus) {
    return { success: false, error: `Cannot ${action} from ${po.po_status} status` };
  }

  // Check permissions
  const permission = await checkPermission(userId, poId, action);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  // Prepare update data
  const updateData: any = {
    po_status: nextStatus,
  };

  if (action === "submit") {
    updateData.submitted_at = new Date().toISOString();
  } else if (action === "approve") {
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = userId;
  } else if (action === "reject") {
    updateData.rejection_reason = comments || null;
  } else if (action === "cancel") {
    updateData.rejection_reason = comments || null;
  }

  // Update PO
  const { data: updatedPO, error: updateError } = await supabase
    .from("purchase_orders")
    .update(updateData)
    .eq("id", poId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create history entry
  await supabase.from("po_approval_history").insert({
    po_id: poId,
    action: action === "submit" ? "submitted" : action === "order" ? "ordered" : action === "receive" ? "received" : action,
    actor_id: userId,
    comments: comments || null,
  });

  return { success: true, updatedPO };
}

