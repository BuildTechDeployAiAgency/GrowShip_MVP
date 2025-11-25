import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand, createNotification } from "./alert-generator";

/**
 * Create notification when a new PO is created
 */
export async function createPOCreatedAlert(
  poId: string,
  poNumber: string,
  brandId: string,
  createdBy: string
): Promise<void> {
  const supabase = await createClient();

  // Get users who should be notified (brand admins and reviewers)
  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("user_id, role_name")
    .eq("brand_id", brandId)
    .eq("status", "approved")
    .in("role_name", ["brand_admin", "brand_logistics", "brand_reviewer"]);

  if (error || !users || users.length === 0) {
    console.error("Error fetching users for PO created notification:", error);
    return;
  }

  // Notify all relevant users except the creator
  for (const user of users) {
    if (user.user_id !== createdBy) {
      try {
        await createNotification({
          user_id: user.user_id,
          type: "order",
          title: "New Purchase Order Created",
          message: `Purchase Order ${poNumber} has been created and requires review`,
          brand_id: brandId,
          related_entity_type: "po",
          related_entity_id: poId,
          priority: "medium",
          action_required: true,
          action_url: `/purchase-orders/${poId}`,
        });
      } catch (err) {
        console.error(`Error creating notification for user ${user.user_id}:`, err);
      }
    }
  }
}

/**
 * Create notification when a PO requires approval
 */
export async function createPOApprovalAlert(
  poId: string,
  poNumber: string,
  brandId: string
): Promise<void> {
  await createNotificationsForBrand(
    {
      type: "order",
      title: "Purchase Order Approval Required",
      message: `Purchase Order ${poNumber} is pending approval`,
      related_entity_type: "po",
      related_entity_id: poId,
      priority: "high",
      action_required: true,
      action_url: `/purchase-orders/${poId}`,
    },
    brandId
  );
}

export async function createPOStatusChangeAlert(
  poId: string,
  poNumber: string,
  status: string,
  userId: string,
  brandId: string
): Promise<void> {
  const supabase = await createClient();

  let title = "";
  let message = "";
  let priority: "low" | "medium" | "high" | "urgent" = "medium";

  switch (status) {
    case "approved":
      title = "Purchase Order Approved";
      message = `Purchase Order ${poNumber} has been approved`;
      priority = "low";
      break;
    case "rejected":
      title = "Purchase Order Rejected";
      message = `Purchase Order ${poNumber} has been rejected`;
      priority = "medium";
      break;
    case "ordered":
      title = "Purchase Order Placed";
      message = `Purchase Order ${poNumber} has been placed with supplier`;
      priority = "low";
      break;
    case "received":
      title = "Purchase Order Received";
      message = `Purchase Order ${poNumber} has been received`;
      priority = "low";
      break;
    default:
      return;
  }

  // Create notification for the user who created the PO
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "order",
    title,
    message,
    brand_id: brandId,
    related_entity_type: "po",
    related_entity_id: poId,
    priority,
    action_required: false,
    action_url: `/purchase-orders/${poId}`,
    is_read: false,
  });

  if (error) {
    console.error("Error creating PO status change notification:", error);
  }
}


