// ================================================
// PO INVENTORY SYNC SERVICE
// ================================================
// Handles inventory synchronization for Purchase Order workflow

import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "@/lib/notifications/alert-generator";

interface POLine {
  id: string;
  product_id: string | null;
  sku: string;
  product_name: string | null;
  quantity: number;
}

/**
 * Sync inventory when PO is approved
 * Creates inbound expectations for all line items
 */
export async function syncPOApproval(
  poId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("id, po_number, brand_id, expected_delivery_date")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return { success: false, error: "Purchase order not found" };
    }

    // Get PO lines
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("id, product_id, sku, product_name, quantity")
      .eq("purchase_order_id", poId);

    if (linesError || !lines || lines.length === 0) {
      return { success: false, error: "No line items found" };
    }

    // Process each line item
    for (const line of lines as POLine[]) {
      if (!line.product_id) continue;

      // Get current product state
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("inbound_stock, quantity_in_stock, allocated_stock")
        .eq("id", line.product_id)
        .single();

      if (productError || !product) {
        console.error(`Product not found: ${line.product_id}`);
        continue;
      }

      const inboundBefore = product.inbound_stock || 0;
      const inboundAfter = inboundBefore + line.quantity;

      // Create transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "PO_APPROVED",
          transaction_date: new Date().toISOString(),
          source_type: "purchase_order",
          source_id: poId,
          reference_number: po.po_number,
          quantity_change: line.quantity,
          quantity_before: product.quantity_in_stock,
          quantity_after: product.quantity_in_stock, // No change to on-hand yet
          allocated_before: product.allocated_stock || 0,
          allocated_after: product.allocated_stock || 0,
          inbound_before: inboundBefore,
          inbound_after: inboundAfter,
          status: "pending",
          notes: `PO ${po.po_number} approved - Expected inbound`,
          brand_id: po.brand_id,
          created_by: userId,
        });

      if (transactionError) {
        console.error("Failed to create transaction:", transactionError);
        continue;
      }

      // Update inbound stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          inbound_stock: inboundAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error("Failed to update inbound stock:", updateError);
      }
    }

    // Create calendar event for expected arrival
    if (po.expected_delivery_date) {
      const { error: calendarError } = await supabase
        .from("calendar_events")
        .insert({
          brand_id: po.brand_id,
          event_type: "shipment_arrival",
          title: `Expected Restock - PO ${po.po_number}`,
          description: `Purchase order ${po.po_number} expected to arrive`,
          event_date: po.expected_delivery_date,
          related_entity_type: "purchase_order",
          related_entity_id: poId,
          is_all_day: true,
          status: "upcoming",
          created_by: null, // System-generated
        });

      if (calendarError) {
        console.error("Failed to create calendar event:", calendarError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in syncPOApproval:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync inventory when PO is received
 * Completes inbound transactions and updates stock levels
 */
export async function syncPOReceipt(
  poId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("id, po_number, brand_id")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return { success: false, error: "Purchase order not found" };
    }

    // Get PO lines
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("id, product_id, sku, product_name, quantity")
      .eq("purchase_order_id", poId);

    if (linesError || !lines || lines.length === 0) {
      return { success: false, error: "No line items found" };
    }

    // Mark pending transactions as completed
    const { error: updateTransactionsError } = await supabase
      .from("inventory_transactions")
      .update({ status: "completed" })
      .eq("source_type", "purchase_order")
      .eq("source_id", poId)
      .eq("transaction_type", "PO_APPROVED")
      .eq("status", "pending");

    if (updateTransactionsError) {
      console.error("Failed to update transactions:", updateTransactionsError);
    }

    // Process each line item
    let totalReceived = 0;
    for (const line of lines as POLine[]) {
      if (!line.product_id) continue;

      // Get current product state
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", line.product_id)
        .single();

      if (productError || !product) {
        console.error(`Product not found: ${line.product_id}`);
        continue;
      }

      const quantityBefore = product.quantity_in_stock || 0;
      const quantityAfter = quantityBefore + line.quantity;
      const inboundBefore = product.inbound_stock || 0;
      const inboundAfter = Math.max(0, inboundBefore - line.quantity);

      // Create receipt transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "PO_RECEIVED",
          transaction_date: new Date().toISOString(),
          source_type: "purchase_order",
          source_id: poId,
          reference_number: po.po_number,
          quantity_change: line.quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          allocated_before: product.allocated_stock || 0,
          allocated_after: product.allocated_stock || 0,
          inbound_before: inboundBefore,
          inbound_after: inboundAfter,
          status: "completed",
          notes: `PO ${po.po_number} received`,
          brand_id: po.brand_id,
          created_by: userId,
        });

      if (transactionError) {
        console.error("Failed to create receipt transaction:", transactionError);
        continue;
      }

      // Update product stock levels
      const { error: updateError } = await supabase
        .from("products")
        .update({
          quantity_in_stock: quantityAfter,
          inbound_stock: inboundAfter,
          last_stock_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error("Failed to update product stock:", updateError);
        continue;
      }

      totalReceived += line.quantity;

      // Check if this resolves any low stock alerts
      if (
        product.enable_stock_alerts &&
        quantityBefore <= product.low_stock_threshold &&
        quantityAfter > product.low_stock_threshold
      ) {
        // Create stock restored notification
        await createNotificationsForBrand(
          {
            type: "success",
            title: "Stock Replenished",
            message: `${product.product_name} (${line.sku}) stock has been replenished to ${quantityAfter} units`,
            related_entity_type: "inventory",
            related_entity_id: line.product_id,
            priority: "low",
            action_required: false,
            action_url: `/products/${line.product_id}`,
          },
          po.brand_id
        );
      }
    }

    // Create notification for PO receipt
    await createNotificationsForBrand(
      {
        type: "success",
        title: "Purchase Order Received",
        message: `PO ${po.po_number} received - ${totalReceived} units added to stock`,
        related_entity_type: "purchase_order",
        related_entity_id: poId,
        priority: "low",
        action_required: false,
        action_url: `/purchase-orders/${poId}`,
      },
      po.brand_id
    );

    // Update calendar event to completed
    const { error: calendarError } = await supabase
      .from("calendar_events")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("related_entity_type", "purchase_order")
      .eq("related_entity_id", poId)
      .eq("event_type", "shipment_arrival");

    if (calendarError) {
      console.error("Failed to update calendar event:", calendarError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in syncPOReceipt:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync inventory when PO is cancelled
 * Reverses inbound expectations or creates reversal transactions
 */
export async function syncPOCancellation(
  poId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("id, po_number, brand_id, po_status")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return { success: false, error: "Purchase order not found" };
    }

    // Get existing transactions
    const { data: existingTransactions, error: transactionsError } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("source_type", "purchase_order")
      .eq("source_id", poId)
      .order("created_at", { ascending: false });

    if (transactionsError) {
      console.error("Failed to get existing transactions:", transactionsError);
    }

    // Get PO lines
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("id, product_id, sku, product_name, quantity")
      .eq("purchase_order_id", poId);

    if (linesError || !lines || lines.length === 0) {
      return { success: false, error: "No line items found" };
    }

    // Process each line item
    for (const line of lines as POLine[]) {
      if (!line.product_id) continue;

      // Get current product state
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", line.product_id)
        .single();

      if (productError || !product) {
        console.error(`Product not found: ${line.product_id}`);
        continue;
      }

      // Check if PO was received (need to reverse stock)
      const wasReceived = existingTransactions?.some(
        (t) => t.transaction_type === "PO_RECEIVED" && t.sku === line.sku
      );

      if (wasReceived) {
        // Reverse received stock
        const quantityBefore = product.quantity_in_stock || 0;
        const quantityAfter = Math.max(0, quantityBefore - line.quantity);

        await supabase.from("inventory_transactions").insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "PO_CANCELLED",
          transaction_date: new Date().toISOString(),
          source_type: "purchase_order",
          source_id: poId,
          reference_number: po.po_number,
          quantity_change: -line.quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          allocated_before: product.allocated_stock || 0,
          allocated_after: product.allocated_stock || 0,
          inbound_before: product.inbound_stock || 0,
          inbound_after: product.inbound_stock || 0,
          status: "completed",
          notes: reason || `PO ${po.po_number} cancelled - Stock reversed`,
          brand_id: po.brand_id,
          created_by: userId,
        });

        // Update product stock
        await supabase
          .from("products")
          .update({
            quantity_in_stock: quantityAfter,
            updated_at: new Date().toISOString(),
          })
          .eq("id", line.product_id);
      } else {
        // Just reverse inbound expectations
        const inboundBefore = product.inbound_stock || 0;
        const inboundAfter = Math.max(0, inboundBefore - line.quantity);

        await supabase.from("inventory_transactions").insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "PO_CANCELLED",
          transaction_date: new Date().toISOString(),
          source_type: "purchase_order",
          source_id: poId,
          reference_number: po.po_number,
          quantity_change: 0, // No on-hand change
          quantity_before: product.quantity_in_stock || 0,
          quantity_after: product.quantity_in_stock || 0,
          allocated_before: product.allocated_stock || 0,
          allocated_after: product.allocated_stock || 0,
          inbound_before: inboundBefore,
          inbound_after: inboundAfter,
          status: "completed",
          notes: reason || `PO ${po.po_number} cancelled - Inbound reversed`,
          brand_id: po.brand_id,
          created_by: userId,
        });

        // Update inbound stock
        await supabase
          .from("products")
          .update({
            inbound_stock: inboundAfter,
            updated_at: new Date().toISOString(),
          })
          .eq("id", line.product_id);
      }
    }

    // Mark pending transactions as cancelled
    await supabase
      .from("inventory_transactions")
      .update({ status: "cancelled" })
      .eq("source_type", "purchase_order")
      .eq("source_id", poId)
      .eq("status", "pending");

    // Delete related calendar events
    await supabase
      .from("calendar_events")
      .delete()
      .eq("related_entity_type", "purchase_order")
      .eq("related_entity_id", poId);

    // Create notification
    await createNotificationsForBrand(
      {
        type: "info",
        title: "Purchase Order Cancelled",
        message: `PO ${po.po_number} has been cancelled - Inventory updated`,
        related_entity_type: "purchase_order",
        related_entity_id: poId,
        priority: "low",
        action_required: false,
        action_url: `/purchase-orders/${poId}`,
      },
      po.brand_id
    );

    return { success: true };
  } catch (error) {
    console.error("Error in syncPOCancellation:", error);
    return { success: false, error: String(error) };
  }
}

