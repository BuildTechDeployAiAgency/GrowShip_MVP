// ================================================
// ORDER INVENTORY SYNC SERVICE
// ================================================
// Handles inventory synchronization for Order workflow

import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "@/lib/notifications/alert-generator";

interface OrderLine {
  id: string;
  product_id: string | null;
  sku: string;
  product_name: string | null;
  quantity: number;
}

/**
 * Check stock availability for order lines
 */
export async function checkStockAvailability(
  orderLines: OrderLine[]
): Promise<{
  sufficient: boolean;
  details: Array<{
    product_id: string;
    sku: string;
    product_name: string;
    requested: number;
    available: number;
    shortfall: number;
  }>;
}> {
  const supabase = await createClient();
  const details: Array<{
    product_id: string;
    sku: string;
    product_name: string;
    requested: number;
    available: number;
    shortfall: number;
  }> = [];
  let sufficient = true;

  for (const line of orderLines) {
    if (!line.product_id) continue;

    // Get current product available stock
    const { data: product, error } = await supabase
      .from("products")
      .select("available_stock, product_name")
      .eq("id", line.product_id)
      .single();

    if (error || !product) {
      sufficient = false;
      details.push({
        product_id: line.product_id,
        sku: line.sku,
        product_name: line.product_name || "Unknown",
        requested: line.quantity,
        available: 0,
        shortfall: line.quantity,
      });
      continue;
    }

    const available = product.available_stock || 0;
    const shortfall = Math.max(0, line.quantity - available);

    if (shortfall > 0) {
      sufficient = false;
    }

    details.push({
      product_id: line.product_id,
      sku: line.sku,
      product_name: product.product_name,
      requested: line.quantity,
      available,
      shortfall,
    });
  }

  return { sufficient, details };
}

/**
 * Sync inventory when order is submitted (allocate stock)
 */
export async function syncOrderAllocation(
  orderId: string,
  userId: string,
  allowNegativeStock: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, brand_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    // Get order lines
    const { data: lines, error: linesError } = await supabase
      .from("order_lines")
      .select("id, product_id, sku, product_name, quantity")
      .eq("order_id", orderId);

    if (linesError || !lines || lines.length === 0) {
      return { success: false, error: "No line items found" };
    }

    // Check stock availability first
    const availabilityCheck = await checkStockAvailability(lines as OrderLine[]);
    if (!allowNegativeStock && !availabilityCheck.sufficient) {
      const insufficientItems = availabilityCheck.details
        .filter((d) => d.shortfall > 0)
        .map((d) => `${d.sku} (need ${d.shortfall} more)`)
        .join(", ");
      return {
        success: false,
        error: `Insufficient stock for: ${insufficientItems}`,
      };
    }

    // Process each line item
    for (const line of lines as OrderLine[]) {
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

      const allocatedBefore = product.allocated_stock || 0;
      const allocatedAfter = allocatedBefore + line.quantity;

      // Create allocation transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "ORDER_ALLOCATED",
          transaction_date: new Date().toISOString(),
          source_type: "order",
          source_id: orderId,
          reference_number: order.order_number,
          quantity_change: 0, // No change to on-hand yet
          quantity_before: product.quantity_in_stock,
          quantity_after: product.quantity_in_stock,
          allocated_before: allocatedBefore,
          allocated_after: allocatedAfter,
          inbound_before: product.inbound_stock || 0,
          inbound_after: product.inbound_stock || 0,
          status: "completed",
          notes: `Order ${order.order_number} - Stock allocated`,
          brand_id: order.brand_id,
          created_by: userId,
        });

      if (transactionError) {
        console.error("Failed to create transaction:", transactionError);
        continue;
      }

      // Update allocated stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          allocated_stock: allocatedAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error("Failed to update allocated stock:", updateError);
        continue;
      }

      // Check if allocation causes low stock warning
      const availableAfter = product.quantity_in_stock - allocatedAfter;
      if (
        product.enable_stock_alerts &&
        availableAfter <= product.low_stock_threshold &&
        availableAfter > 0
      ) {
        await createNotificationsForBrand(
          {
            type: "warning",
            title: "Low Available Stock",
            message: `${product.product_name} (${line.sku}) has ${availableAfter} units available after allocation`,
            related_entity_type: "inventory",
            related_entity_id: line.product_id,
            priority: "high",
            action_required: true,
            action_url: `/products/${line.product_id}`,
          },
          order.brand_id
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error in syncOrderAllocation:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync inventory when order is fulfilled (consume allocated stock)
 */
export async function syncOrderFulfillment(
  orderId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, brand_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    // Get order lines
    const { data: lines, error: linesError } = await supabase
      .from("order_lines")
      .select("id, product_id, sku, product_name, quantity")
      .eq("order_id", orderId);

    if (linesError || !lines || lines.length === 0) {
      return { success: false, error: "No line items found" };
    }

    // Process each line item
    let totalFulfilled = 0;
    for (const line of lines as OrderLine[]) {
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
      const quantityAfter = quantityBefore - line.quantity;
      const allocatedBefore = product.allocated_stock || 0;
      const allocatedAfter = Math.max(0, allocatedBefore - line.quantity);

      // Create fulfillment transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "ORDER_FULFILLED",
          transaction_date: new Date().toISOString(),
          source_type: "order",
          source_id: orderId,
          reference_number: order.order_number,
          quantity_change: -line.quantity,
          quantity_before: quantityBefore,
          quantity_after: quantityAfter,
          allocated_before: allocatedBefore,
          allocated_after: allocatedAfter,
          inbound_before: product.inbound_stock || 0,
          inbound_after: product.inbound_stock || 0,
          status: "completed",
          notes: `Order ${order.order_number} fulfilled`,
          brand_id: order.brand_id,
          created_by: userId,
        });

      if (transactionError) {
        console.error("Failed to create transaction:", transactionError);
        continue;
      }

      // Update product stock levels
      const { error: updateError } = await supabase
        .from("products")
        .update({
          quantity_in_stock: quantityAfter,
          allocated_stock: allocatedAfter,
          last_stock_check: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error("Failed to update product stock:", updateError);
        continue;
      }

      totalFulfilled += line.quantity;

      // Check if fulfillment causes critical stock alert
      if (product.enable_stock_alerts) {
        if (quantityAfter === 0) {
          await createNotificationsForBrand(
            {
              type: "warning",
              title: "Product Out of Stock",
              message: `${product.product_name} (${line.sku}) is now out of stock`,
              related_entity_type: "inventory",
              related_entity_id: line.product_id,
              priority: "urgent",
              action_required: true,
              action_url: `/products/${line.product_id}`,
            },
            order.brand_id
          );
        } else if (quantityAfter <= product.critical_stock_threshold) {
          await createNotificationsForBrand(
            {
              type: "warning",
              title: "Critical Stock Level",
              message: `${product.product_name} (${line.sku}) has ${quantityAfter} units remaining (critical level)`,
              related_entity_type: "inventory",
              related_entity_id: line.product_id,
              priority: "urgent",
              action_required: true,
              action_url: `/products/${line.product_id}`,
            },
            order.brand_id
          );
        } else if (quantityAfter <= product.low_stock_threshold) {
          await createNotificationsForBrand(
            {
              type: "warning",
              title: "Low Stock Alert",
              message: `${product.product_name} (${line.sku}) has ${quantityAfter} units remaining`,
              related_entity_type: "inventory",
              related_entity_id: line.product_id,
              priority: "high",
              action_required: true,
              action_url: `/products/${line.product_id}`,
            },
            order.brand_id
          );
        }
      }
    }

    // Create notification for order fulfillment
    await createNotificationsForBrand(
      {
        type: "success",
        title: "Order Fulfilled",
        message: `Order ${order.order_number} fulfilled - ${totalFulfilled} units shipped`,
        related_entity_type: "order",
        related_entity_id: orderId,
        priority: "low",
        action_required: false,
        action_url: `/orders/${orderId}`,
      },
      order.brand_id
    );

    return { success: true };
  } catch (error) {
    console.error("Error in syncOrderFulfillment:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync inventory when order is cancelled (release allocated stock)
 */
export async function syncOrderCancellation(
  orderId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, brand_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: "Order not found" };
    }

    // Get order lines
    const { data: lines, error: linesError } = await supabase
      .from("order_lines")
      .select("id, product_id, sku, product_name, quantity")
      .eq("order_id", orderId);

    if (linesError || !lines || lines.length === 0) {
      return { success: false, error: "No line items found" };
    }

    // Process each line item
    for (const line of lines as OrderLine[]) {
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

      const allocatedBefore = product.allocated_stock || 0;
      const allocatedAfter = Math.max(0, allocatedBefore - line.quantity);

      // Create cancellation transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: line.product_id,
          sku: line.sku,
          product_name: line.product_name,
          transaction_type: "ORDER_CANCELLED",
          transaction_date: new Date().toISOString(),
          source_type: "order",
          source_id: orderId,
          reference_number: order.order_number,
          quantity_change: 0, // No change to on-hand
          quantity_before: product.quantity_in_stock,
          quantity_after: product.quantity_in_stock,
          allocated_before: allocatedBefore,
          allocated_after: allocatedAfter,
          inbound_before: product.inbound_stock || 0,
          inbound_after: product.inbound_stock || 0,
          status: "completed",
          notes: reason || `Order ${order.order_number} cancelled - Stock released`,
          brand_id: order.brand_id,
          created_by: userId,
        });

      if (transactionError) {
        console.error("Failed to create transaction:", transactionError);
        continue;
      }

      // Update allocated stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          allocated_stock: allocatedAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error("Failed to update allocated stock:", updateError);
      }
    }

    // Create notification for order cancellation
    await createNotificationsForBrand(
      {
        type: "info",
        title: "Order Cancelled",
        message: `Order ${order.order_number} cancelled - Stock released`,
        related_entity_type: "order",
        related_entity_id: orderId,
        priority: "low",
        action_required: false,
        action_url: `/orders/${orderId}`,
      },
      order.brand_id
    );

    return { success: true };
  } catch (error) {
    console.error("Error in syncOrderCancellation:", error);
    return { success: false, error: String(error) };
  }
}

