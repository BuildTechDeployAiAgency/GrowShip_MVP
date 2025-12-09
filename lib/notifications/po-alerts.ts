/**
 * ============================================================================
 * PURCHASE ORDER ALERTS
 * ============================================================================
 * Handles all PO-related notifications using the role-based NotificationDispatcher.
 * 
 * Notification Types:
 *   - po_created: New PO created and requires review
 *   - po_approval_required: PO submitted for approval
 *   - po_approved: PO has been approved
 *   - po_rejected: PO has been rejected
 *   - po_placed: PO has been placed with supplier
 *   - po_received: PO has been received (inventory updated)
 */

import { NotificationDispatcher, dispatchToUser } from "./dispatcher";

/**
 * Create notification when a new PO is created
 * Uses role-based dispatch - recipients determined by notification_role_settings
 */
export async function createPOCreatedAlert(
  poId: string,
  poNumber: string,
  brandId: string,
  createdBy: string
): Promise<void> {
  const result = await NotificationDispatcher.dispatch(
    "po_created",
    {
      title: "New Purchase Order Created",
      message: `Purchase Order ${poNumber} has been created and requires review`,
      brandId,
      relatedEntityType: "po",
      relatedEntityId: poId,
      actionUrl: `/purchase-orders/${poId}`,
    },
    {
      excludeUserId: createdBy, // Don't notify the creator (brand users)
      // Note: Super admins will still be notified based on their role settings
    }
  );

  if (!result.success) {
    console.error("Error creating PO created notification:", result.error);
  } else {
    console.log(`[createPOCreatedAlert] Sent ${result.notificationsSent} notifications for PO ${poNumber}`);
  }
}

/**
 * Create notification when a PO requires approval
 * Uses role-based dispatch - only brand_admin, brand_manager, and super_admin receive
 */
export async function createPOApprovalAlert(
  poId: string,
  poNumber: string,
  brandId: string,
  submitterId?: string
): Promise<void> {
  const result = await NotificationDispatcher.dispatch(
    "po_approval_required",
    {
      title: "Purchase Order Approval Required",
      message: `Purchase Order ${poNumber} is pending approval`,
      brandId,
      relatedEntityType: "po",
      relatedEntityId: poId,
      priority: "high",
      actionRequired: true,
      actionUrl: `/purchase-orders/${poId}`,
    },
    {
      excludeUserId: submitterId, // Don't notify the submitter (brand users)
      // Note: Super admins will still be notified based on their role settings
    }
  );

  if (!result.success) {
    console.error("Error creating PO approval notification:", result.error);
  } else {
    console.log(`[createPOApprovalAlert] Sent ${result.notificationsSent} notifications for PO ${poNumber}`);
  }
}

/**
 * Create notification when PO status changes (approved, rejected, ordered, received)
 * Sends to the PO creator only using dispatchToUser
 */
export async function createPOStatusChangeAlert(
  poId: string,
  poNumber: string,
  status: string,
  userId: string,
  brandId: string
): Promise<void> {
  // Map status to notification type and content
  let typeKey: string;
  let title: string;
  let message: string;
  let priority: "low" | "medium" | "high" | "urgent";

  switch (status) {
    case "approved":
      typeKey = "po_approved";
      title = "Purchase Order Approved";
      message = `Purchase Order ${poNumber} has been approved`;
      priority = "low";
      break;
    case "rejected":
      typeKey = "po_rejected";
      title = "Purchase Order Rejected";
      message = `Purchase Order ${poNumber} has been rejected`;
      priority = "medium";
      break;
    case "ordered":
      typeKey = "po_placed";
      title = "Purchase Order Placed";
      message = `Purchase Order ${poNumber} has been placed with supplier`;
      priority = "low";
      break;
    case "received":
      typeKey = "po_received";
      title = "Purchase Order Received";
      message = `Purchase Order ${poNumber} has been received`;
      priority = "low";
      break;
    default:
      console.warn(`[createPOStatusChangeAlert] Unknown status: ${status}`);
      return;
  }

  // Send directly to the PO creator
  const result = await dispatchToUser(
    typeKey,
    userId,
    {
      title,
      message,
      relatedEntityType: "po",
      relatedEntityId: poId,
      priority,
      actionRequired: false,
      actionUrl: `/purchase-orders/${poId}`,
    }
  );

  if (!result.success) {
    console.error(`Error creating PO ${status} notification:`, result.error);
  } else {
    console.log(`[createPOStatusChangeAlert] Sent notification for PO ${poNumber} (${status})`);
  }
}
