import { createAdminClient } from "@/lib/supabase/server";
import { POStatus, POAction, WorkflowTransition, isValidTransition, getNextStatus } from "./workflow-utils";
import { syncPOApproval, syncPOReceipt, syncPOCancellation } from "@/lib/inventory/po-sync";

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

// Re-export types and pure functions for convenience
export type { POStatus, POAction, WorkflowTransition };
export { isValidTransition, getNextStatus };

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

  // Handle inventory synchronization based on action
  if (action === "receive") {
    // Sync inventory when PO is received
    const syncResult = await syncPOReceipt(poId, userId);
    if (!syncResult.success) {
      console.error("Failed to sync inventory on PO receipt:", syncResult.error);
      // Don't fail the transition, but log the error
    }
  } else if (action === "cancel") {
    // Sync inventory when PO is cancelled
    const syncResult = await syncPOCancellation(poId, userId, comments);
    if (!syncResult.success) {
      console.error("Failed to sync inventory on PO cancellation:", syncResult.error);
    }
  }

  return { success: true, updatedPO };
}

/**
 * Validate stock requirements for all PO lines
 */
export async function validateStockRequirements(
  poId: string
): Promise<{ valid: boolean; warnings: string[]; errors: string[] }> {
  const supabase = createAdminClient();

  const warnings: string[] = [];
  const errors: string[] = [];

  // Get all lines for the PO
  const { data: lines, error: linesError } = await supabase
    .from("purchase_order_lines")
    .select("id, sku, requested_qty, available_stock, line_status")
    .eq("purchase_order_id", poId);

  if (linesError || !lines) {
    errors.push("Failed to fetch PO lines");
    return { valid: false, warnings, errors };
  }

  for (const line of lines) {
    const requestedQty = line.requested_qty;
    const availableStock = line.available_stock ?? 0;

    if (line.line_status === "pending") {
      if (availableStock < requestedQty) {
        if (availableStock === 0) {
          errors.push(
            `Line ${line.sku}: No stock available (requested ${requestedQty})`
          );
        } else {
          warnings.push(
            `Line ${line.sku}: Partial stock (${availableStock}/${requestedQty})`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Finalize PO approval after all lines are reviewed
 */
export async function finalizeApproval(
  poId: string,
  userId: string
): Promise<{ success: boolean; error?: string; po?: any }> {
  const supabase = createAdminClient();

  // Get all lines
  const { data: lines, error: linesError } = await supabase
    .from("purchase_order_lines")
    .select("*")
    .eq("purchase_order_id", poId);

  if (linesError || !lines || lines.length === 0) {
    return { success: false, error: "No lines found for this PO" };
  }

  // Check if all lines have been reviewed
  const hasUnreviewedLines = lines.some(
    (line) => line.line_status === "pending"
  );

  if (hasUnreviewedLines) {
    return {
      success: false,
      error: "All line items must be reviewed before finalizing approval",
    };
  }

  // Calculate totals
  let totalRequested = 0;
  let totalApproved = 0;
  let totalBackordered = 0;

  for (const line of lines) {
    totalRequested += line.requested_qty || 0;
    totalApproved += line.approved_qty || 0;
    totalBackordered += line.backorder_qty || 0;
  }

  const fulfillmentPercentage =
    totalRequested > 0
      ? Math.round((totalApproved / totalRequested) * 100)
      : 0;

  // Determine final PO status
  const allApproved = lines.every((line) => line.line_status === "approved");
  const allRejected = lines.every(
    (line) =>
      line.line_status === "rejected" || line.line_status === "cancelled"
  );

  let finalStatus: string;
  if (allApproved) {
    finalStatus = "approved";
  } else if (allRejected) {
    finalStatus = "rejected";
  } else {
    finalStatus = "approved"; // Partially approved still goes to approved
  }

  // Update PO with summary
  const { data: updatedPO, error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      po_status: finalStatus,
      total_requested_qty: totalRequested,
      total_approved_qty: totalApproved,
      total_backordered_qty: totalBackordered,
      fulfillment_percentage: fulfillmentPercentage,
      approved_at: new Date().toISOString(),
      approved_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: "Failed to update PO" };
  }

  // Create final approval history entry
  await supabase.from("po_approval_history").insert({
    po_id: poId,
    action: "approved",
    actor_id: userId,
    comments: `PO finalized: ${fulfillmentPercentage}% fulfillment`,
    affected_line_ids: lines.map((l) => l.id),
  });

  // Sync inventory when PO is approved
  if (finalStatus === "approved") {
    const syncResult = await syncPOApproval(poId, userId);
    if (!syncResult.success) {
      console.error("Failed to sync inventory on PO approval:", syncResult.error);
      // Don't fail the approval, but log the error
    }
  }

  return { success: true, po: updatedPO };
}

/**
 * Apply stock override for a line
 */
export async function applyStockOverride(
  poId: string,
  lineId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Update line with override info
  const { error } = await supabase
    .from("purchase_order_lines")
    .update({
      override_applied: true,
      override_by: userId,
      override_reason: reason,
      override_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", lineId)
    .eq("purchase_order_id", poId);

  if (error) {
    return { success: false, error: "Failed to apply override" };
  }

  // Log override in history
  await supabase.from("po_approval_history").insert({
    po_id: poId,
    action: "approved",
    actor_id: userId,
    comments: `Stock override applied: ${reason}`,
    affected_line_ids: [lineId],
    override_applied: true,
  });

  return { success: true };
}

