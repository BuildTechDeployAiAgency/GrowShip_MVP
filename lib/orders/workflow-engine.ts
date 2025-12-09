import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncOrderAllocation, syncOrderFulfillment, syncOrderCancellation } from "@/lib/inventory/order-sync";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type OrderAction = "process" | "ship" | "deliver" | "cancel";

export interface OrderWorkflowTransition {
  from: OrderStatus;
  to: OrderStatus;
  action: OrderAction;
  requiresApproval?: boolean;
  allowedRoles?: string[];
}

const VALID_TRANSITIONS: OrderWorkflowTransition[] = [
  { from: "pending", to: "processing", action: "process" },
  { from: "processing", to: "shipped", action: "ship" },
  { from: "pending", to: "shipped", action: "ship" }, // Direct fulfillment
  { from: "shipped", to: "delivered", action: "deliver" },
  { from: "pending", to: "cancelled", action: "cancel" },
  { from: "processing", to: "cancelled", action: "cancel" },
];

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  action: OrderAction
): boolean {
  return VALID_TRANSITIONS.some(
    (transition) =>
      transition.from === currentStatus &&
      transition.to === targetStatus &&
      transition.action === action
  );
}

/**
 * Get available actions for an order status
 */
export function getAvailableActions(status: OrderStatus): OrderAction[] {
  return VALID_TRANSITIONS
    .filter((transition) => transition.from === status)
    .map((transition) => transition.action);
}

/**
 * Get next status for an action
 */
export function getNextStatus(status: OrderStatus, action: OrderAction): OrderStatus | null {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === status && t.action === action
  );
  return transition?.to || null;
}

/**
 * Validate order against purchase order constraints
 */
export async function validateOrderAgainstPO(
  orderId: string,
  purchaseOrderId: string
): Promise<{ valid: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // Get order details
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("brand_id, distributor_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { valid: false, reason: "Order not found" };
  }

  // Get PO details
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("brand_id, distributor_id, po_status")
    .eq("id", purchaseOrderId)
    .single();

  if (poError || !po) {
    return { valid: false, reason: "Purchase order not found" };
  }

  // Validate PO status
  if (po.po_status !== "approved" && po.po_status !== "ordered") {
    return {
      valid: false,
      reason: `Purchase order must be approved or ordered. Current status: ${po.po_status}`,
    };
  }

  // Validate brand matches
  if (order.brand_id !== po.brand_id) {
    return {
      valid: false,
      reason: "Order brand does not match purchase order brand",
    };
  }

  // Validate distributor matches (if PO has distributor)
  if (po.distributor_id && order.distributor_id !== po.distributor_id) {
    return {
      valid: false,
      reason: "Order distributor does not match purchase order distributor",
    };
  }

  return { valid: true };
}

/**
 * Check if user has permission to perform action on order
 */
export async function checkPermission(
  userId: string,
  orderId: string,
  action: OrderAction
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // Get order details
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("brand_id, distributor_id, order_status, purchase_order_id")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { allowed: false, reason: "Order not found" };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role_name, brand_id, distributor_id")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: "User profile not found" };
  }

  // Super admin can do anything
  const isSuperAdmin = profile.role_name === "super_admin";
  if (isSuperAdmin) {
    return { allowed: true };
  }

  // Check brand/distributor access
  if (profile.brand_id !== order.brand_id) {
    return { allowed: false, reason: "You do not have access to this brand" };
  }

  // Distributor admins can only manage their own orders
  if (
    profile.distributor_id &&
    order.distributor_id !== profile.distributor_id
  ) {
    return {
      allowed: false,
      reason: "You can only manage orders for your distributor",
    };
  }

  // Validate transition
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === order.order_status && t.action === action
  );

  if (!transition) {
    return {
      allowed: false,
      reason: `Cannot ${action} from ${order.order_status} status`,
    };
  }

  // If order is linked to PO, validate PO constraints
  if (order.purchase_order_id) {
    const poValidation = await validateOrderAgainstPO(
      orderId,
      order.purchase_order_id
    );
    if (!poValidation.valid) {
      return { allowed: false, reason: poValidation.reason };
    }
  }

  return { allowed: true };
}

/**
 * Execute workflow transition
 */
export async function executeOrderTransition(
  orderId: string,
  userId: string,
  action: OrderAction,
  notes?: string
): Promise<{ success: boolean; error?: string; updatedOrder?: any }> {
  const supabase = createAdminClient();

  // Get current order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Order not found" };
  }

  // Validate transition
  const nextStatus = getNextStatus(order.order_status as OrderStatus, action);
  if (!nextStatus) {
    return {
      success: false,
      error: `Cannot ${action} from ${order.order_status} status`,
    };
  }

  // Check permissions
  const permission = await checkPermission(userId, orderId, action);
  if (!permission.allowed) {
    return { success: false, error: permission.reason };
  }

  // Prepare update data
  const updateData: any = {
    order_status: nextStatus,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (action === "ship") {
    updateData.actual_delivery_date = new Date().toISOString();
  }

  if (notes) {
    updateData.notes = notes;
  }

  // Update order
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Handle inventory synchronization based on action
  if (action === "process") {
    // Allocate stock when order moves to processing
    const syncResult = await syncOrderAllocation(orderId, userId, true);
    if (!syncResult.success) {
      console.error("Failed to sync inventory on order processing:", syncResult.error);
    }
  } else if (action === "ship") {
    // If coming from pending, allocate first
    if (order.order_status === 'pending') {
         await syncOrderAllocation(orderId, userId, true);
    }
    // Consume allocated stock when order is shipped
    const syncResult = await syncOrderFulfillment(orderId, userId);
    if (!syncResult.success) {
      console.error("Failed to sync inventory on order shipment:", syncResult.error);
    }
  } else if (action === "cancel") {
    // Release allocated stock when order is cancelled
    // Only if it was in processing (where stock is allocated)
    if (order.order_status === 'processing') {
        const syncResult = await syncOrderCancellation(orderId, userId, notes);
        if (!syncResult.success) {
          console.error("Failed to sync inventory on order cancellation:", syncResult.error);
        }
    }
  }

  return { success: true, updatedOrder };
}

/**
 * Validate new order creation with PO link
 */
export async function validateNewOrderWithPO(
  orderData: {
    brand_id: string;
    distributor_id?: string;
    purchase_order_id?: string;
  }
): Promise<{ valid: boolean; reason?: string }> {
  if (!orderData.purchase_order_id) {
    return { valid: true }; // No PO, no validation needed
  }

  const supabase = createAdminClient();

  // Get PO details
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("brand_id, distributor_id, po_status")
    .eq("id", orderData.purchase_order_id)
    .single();

  if (poError || !po) {
    return { valid: false, reason: "Purchase order not found" };
  }

  // Validate PO status
  if (po.po_status !== "approved" && po.po_status !== "ordered") {
    return {
      valid: false,
      reason: `Purchase order must be approved before creating orders. Current status: ${po.po_status}`,
    };
  }

  // Validate brand matches
  if (orderData.brand_id !== po.brand_id) {
    return {
      valid: false,
      reason: "Order brand must match purchase order brand",
    };
  }

  // Validate distributor matches (if PO has distributor and order has distributor)
  if (
    po.distributor_id &&
    orderData.distributor_id &&
    orderData.distributor_id !== po.distributor_id
  ) {
    return {
      valid: false,
      reason: "Order distributor must match purchase order distributor",
    };
  }

  return { valid: true };
}
