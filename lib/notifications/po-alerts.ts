import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createNotificationsForBrand, createNotification } from "./alert-generator";

/**
 * Create notification when a new PO is created
 * Updated to include Super Admins in the notification recipients
 */
export async function createPOCreatedAlert(
  poId: string,
  poNumber: string,
  brandId: string,
  createdBy: string
): Promise<void> {
  // Use admin client so RLS doesn't block cross-user inserts or super admin lookups
  const supabase = createAdminClient();

  // Get users who should be notified (brand admins and reviewers)
  const { data: brandUsers, error: brandUsersError } = await supabase
    .from("user_profiles")
    .select("user_id, role_name")
    .eq("brand_id", brandId)
    .eq("user_status", "approved")
    .in("role_name", ["brand_admin", "brand_logistics", "brand_reviewer"]);

  if (brandUsersError) {
    console.error("Error fetching brand users for PO created notification:", brandUsersError);
  }

  // Get Super Admins (Global - they should always receive PO notifications)
  const { data: superAdmins, error: superAdminsError } = await supabase
    .from("user_profiles")
    .select("user_id, role_name")
    .eq("role_name", "super_admin")
    .eq("user_status", "approved");

  if (superAdminsError) {
    console.error("Error fetching super admins for PO created notification:", superAdminsError);
  }

  // Combine recipients - exclude creator from brand users, but super_admins always get notified
  const brandUsersExcludingCreator = new Set<string>();
  brandUsers?.forEach((u) => {
    // Only exclude creator from brand users, not from super_admin list
    if (u.user_id !== createdBy) {
      brandUsersExcludingCreator.add(u.user_id);
    }
  });

  // Super admins always get notified (even if they created it) for full visibility
  const allRecipients = new Set<string>();
  brandUsersExcludingCreator.forEach((id) => allRecipients.add(id));
  superAdmins?.forEach((u) => allRecipients.add(u.user_id));

  if (allRecipients.size === 0) {
    console.warn(`No recipients found for PO created notification`, {
      poId,
      poNumber,
      brandId,
      createdBy,
    });
    return;
  }

  // Create notifications for all recipients
  const notifications = Array.from(allRecipients).map((userId) => ({
    user_id: userId,
    type: "order",
    title: "New Purchase Order Created",
    message: `Purchase Order ${poNumber} has been created and requires review`,
    brand_id: brandId,
    related_entity_type: "po",
    related_entity_id: poId,
    priority: "medium",
    action_required: true,
    action_url: `/purchase-orders/${poId}`,
    is_read: false,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(notifications);

  if (insertError) {
    console.error("Error creating PO created notifications:", insertError);
  }
}

/**
 * Create notification when a PO requires approval
 * Updated to include Super Admins in the notification recipients
 */
export async function createPOApprovalAlert(
  poId: string,
  poNumber: string,
  brandId: string,
  submitterId?: string // Optional: exclude the submitter from receiving notifications
): Promise<void> {
  // Use admin client so RLS doesn't block cross-user inserts or super admin lookups
  const supabase = createAdminClient();

  // 1. Get Brand Approvers (Admins & Managers)
  const { data: brandUsers, error: brandUsersError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("brand_id", brandId)
    .eq("user_status", "approved")
    .in("role_name", ["brand_admin", "brand_manager"]);

  if (brandUsersError) {
    console.error("Error fetching brand users for PO approval notification:", brandUsersError);
  }

  // 2. Get Super Admins (Global - they should always receive approval notifications)
  const { data: superAdmins, error: superAdminsError } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("role_name", "super_admin")
    .eq("user_status", "approved");

  if (superAdminsError) {
    console.error("Error fetching super admins for PO approval notification:", superAdminsError);
  }

  // 3. Combine recipients - exclude submitter from brand approvers, but super_admins always get notified
  const brandApproversExcludingSubmitter = new Set<string>();
  brandUsers?.forEach((u) => {
    // Only exclude submitter from brand approvers, not from super_admin list
    if (!submitterId || u.user_id !== submitterId) {
      brandApproversExcludingSubmitter.add(u.user_id);
    }
  });

  // Super admins always get notified (even if they submitted) for full visibility
  const allRecipients = new Set<string>();
  brandApproversExcludingSubmitter.forEach((id) => allRecipients.add(id));
  superAdmins?.forEach((u) => allRecipients.add(u.user_id));

  // 5. Create notifications for all recipients
  if (allRecipients.size === 0) {
    console.warn(`No recipients found for PO approval notification`, {
      poId,
      poNumber,
      brandId,
      submitterId,
    });
    return;
  }

  const notifications = Array.from(allRecipients).map((userId) => ({
    user_id: userId,
    type: "order",
    title: "Purchase Order Approval Required",
    message: `Purchase Order ${poNumber} is pending approval`,
    brand_id: brandId,
    related_entity_type: "po",
    related_entity_id: poId,
    priority: "high",
    action_required: true,
    action_url: `/purchase-orders/${poId}`,
    is_read: false,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(notifications);

  if (insertError) {
    console.error("Error creating PO approval notifications:", insertError);
  }
}

export async function createPOStatusChangeAlert(
  poId: string,
  poNumber: string,
  status: string,
  userId: string,
  brandId: string
): Promise<void> {
  // Use admin client to avoid RLS issues when notifying other users
  const supabase = createAdminClient();

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
