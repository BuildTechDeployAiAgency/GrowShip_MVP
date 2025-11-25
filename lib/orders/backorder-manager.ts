import { createClient } from "@/lib/supabase/server";
import { POBackorder } from "@/types/purchase-orders";

/**
 * Create backorder record for a PO line
 */
export async function createBackorderRecord(
  poId: string,
  lineId: string,
  productId: string | null,
  sku: string,
  qty: number,
  expectedDate?: string,
  userId?: string
): Promise<{ success: boolean; backorder?: POBackorder; error?: string }> {
  const supabase = await createClient();

  const backorderData: any = {
    po_id: poId,
    po_line_id: lineId,
    product_id: productId,
    sku,
    backorder_qty: qty,
    backorder_status: "pending",
    fulfilled_qty: 0,
    created_by: userId,
    updated_by: userId,
  };

  if (expectedDate) {
    backorderData.expected_fulfillment_date = expectedDate;
  }

  const { data, error } = await supabase
    .from("po_backorders")
    .insert(backorderData)
    .select()
    .single();

  if (error) {
    console.error("Error creating backorder:", error);
    return { success: false, error: error.message };
  }

  return { success: true, backorder: data };
}

/**
 * Update backorder status and fulfilled quantity
 */
export async function trackBackorder(
  backorderId: string,
  status: "pending" | "partially_fulfilled" | "fulfilled" | "cancelled",
  fulfilledQty: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("po_backorders")
    .update({
      backorder_status: status,
      fulfilled_qty: fulfilledQty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", backorderId);

  if (error) {
    console.error("Error updating backorder:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Generate notification for backorder creation
 */
export async function generateBackorderAlert(
  backorderId: string,
  poNumber: string,
  brandId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "order",
    title: "Items Backordered",
    message: `Some items from Purchase Order ${poNumber} have been placed on backorder`,
    brand_id: brandId,
    related_entity_type: "backorder",
    related_entity_id: backorderId,
    priority: "medium",
    action_required: false,
    is_read: false,
  });
}

/**
 * Link backorder to future order when fulfilled
 */
export async function linkBackorderToFutureOrder(
  backorderId: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // This could be implemented with a junction table or notes field
  // For now, we'll add a note to the backorder
  const { error } = await supabase
    .from("po_backorders")
    .update({
      notes: `Fulfilled by order ${orderId}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", backorderId);

  if (error) {
    console.error("Error linking backorder to order:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all backorders for a PO
 */
export async function getBackordersForPO(
  poId: string
): Promise<POBackorder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("po_backorders")
    .select("*")
    .eq("po_id", poId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching backorders:", error);
    return [];
  }

  return data || [];
}

/**
 * Cancel backorder
 */
export async function cancelBackorder(
  backorderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("po_backorders")
    .update({
      backorder_status: "cancelled",
      notes: reason || "Backorder cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", backorderId);

  if (error) {
    console.error("Error cancelling backorder:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get pending backorders that can be fulfilled
 */
export async function getPendingBackorders(
  brandId: string
): Promise<POBackorder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("po_backorders")
    .select(`
      *,
      purchase_orders!inner(brand_id)
    `)
    .eq("purchase_orders.brand_id", brandId)
    .eq("backorder_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching pending backorders:", error);
    return [];
  }

  return data || [];
}

