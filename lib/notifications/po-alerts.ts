import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "./alert-generator";

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


