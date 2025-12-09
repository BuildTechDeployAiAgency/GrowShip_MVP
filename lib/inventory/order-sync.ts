// ================================================
// ORDER INVENTORY SYNC SERVICE
// ================================================
// Handles inventory synchronization for Order workflow

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "@/lib/notifications/alert-generator";

interface OrderLine {
  id: string;
  product_id: string | null;
  sku: string;
  product_name: string | null;
  quantity: number;
}

interface OrderItemJson {
  product_id?: string;
  sku: string;
  product_name?: string;
  quantity: number;
}

/**
 * Get order lines from order_lines table OR fallback to items JSON
 * This ensures we can process orders regardless of how they were created
 */
async function getOrderLinesOrFallback(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  orderItems: OrderItemJson[] | null
): Promise<{ lines: OrderLine[]; source: "order_lines" | "items_json" }> {
  // First, try to get from order_lines table
  const { data: lines, error: linesError } = await supabase
    .from("order_lines")
    .select("id, product_id, sku, product_name, quantity")
    .eq("order_id", orderId);

  if (!linesError && lines && lines.length > 0) {
    return { lines: lines as OrderLine[], source: "order_lines" };
  }

  // Fallback: Parse items JSON and resolve product_ids by SKU
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return { lines: [], source: "items_json" };
  }

  console.log(`[getOrderLinesOrFallback] Falling back to items JSON (${orderItems.length} items)`);

  const parsedLines: OrderLine[] = [];
  for (const item of orderItems) {
    let productId = item.product_id || null;

    // If no product_id, try to resolve by SKU
    if (!productId && item.sku) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("sku", item.sku)
        .single();
      
      if (product) {
        productId = product.id;
      }
    }

    parsedLines.push({
      id: `json-${orderId}-${item.sku}`, // Synthetic ID
      product_id: productId,
      sku: item.sku,
      product_name: item.product_name || null,
      quantity: Number(item.quantity) || 0,
    });
  }

  return { lines: parsedLines, source: "items_json" };
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
  // Use admin client to bypass RLS for system operations
  const supabase = createAdminClient();
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
    console.log(`[syncOrderAllocation] Starting allocation for order ${orderId}`);
    // Use admin client to bypass RLS for system operations
    const supabase = createAdminClient();

    // Get order details (include items for fallback)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, brand_id, items")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.log(`[syncOrderAllocation] Order ${orderId} not found:`, orderError);
      return { success: false, error: "Order not found" };
    }
    console.log(`[syncOrderAllocation] Found order ${order.order_number} (brand: ${order.brand_id})`);

    // Get order lines (with fallback to items JSON)
    const { lines, source } = await getOrderLinesOrFallback(supabase, orderId, order.items);

    if (!lines || lines.length === 0) {
      console.log(`[syncOrderAllocation] No line items found for order ${orderId} (checked order_lines table and items JSON)`);
      return { success: false, error: "No line items found" };
    }
    console.log(`[syncOrderAllocation] Found ${lines.length} line item(s) for order ${orderId} (source: ${source})`);

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
      console.log(`[syncOrderAllocation] Processing line: SKU=${line.sku}, product_id=${line.product_id}, qty=${line.quantity}`);
      
      if (!line.product_id) {
        console.log(`[syncOrderAllocation] ⚠️ SKIPPING line ${line.sku} - no product_id! Attempting to resolve by SKU...`);
        
        // Try to resolve product_id by SKU
        const { data: productBySku } = await supabase
          .from("products")
          .select("id")
          .eq("sku", line.sku)
          .single();
        
        if (productBySku) {
          console.log(`[syncOrderAllocation] ✅ Resolved product_id ${productBySku.id} for SKU ${line.sku}`);
          line.product_id = productBySku.id;
        } else {
          console.log(`[syncOrderAllocation] ❌ Could not resolve product_id for SKU ${line.sku} - skipping`);
          continue;
        }
      }

      // Get current product state
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", line.product_id)
        .single();

      if (productError || !product) {
        console.error(`[syncOrderAllocation] Product not found: ${line.product_id}`);
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
        console.error(`[syncOrderAllocation] Failed to create ORDER_ALLOCATED transaction for SKU ${line.sku}:`, transactionError);
        return { success: false, error: `Transaction creation failed: ${transactionError.message}` };
      }
      console.log(`[syncOrderAllocation] Created ORDER_ALLOCATED transaction for SKU ${line.sku} (qty: ${line.quantity})`);

      // Update allocated stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          allocated_stock: allocatedAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error(`[syncOrderAllocation] Failed to update allocated stock for product ${line.product_id}:`, updateError);
        continue;
      }
      console.log(`[syncOrderAllocation] Updated allocated_stock for ${line.sku}: ${allocatedBefore} -> ${allocatedAfter}`);

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
            related_entity_id: line.product_id ?? undefined,
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
    console.log(`[syncOrderFulfillment] Starting fulfillment for order ${orderId}`);
    // Use admin client to bypass RLS for system operations
    const supabase = createAdminClient();

    // Get order details (include items for fallback)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, brand_id, items")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.log(`[syncOrderFulfillment] Order ${orderId} not found:`, orderError);
      return { success: false, error: "Order not found" };
    }
    console.log(`[syncOrderFulfillment] Found order ${order.order_number} (brand: ${order.brand_id})`);

    // Get order lines (with fallback to items JSON)
    const { lines, source } = await getOrderLinesOrFallback(supabase, orderId, order.items);

    if (!lines || lines.length === 0) {
      console.log(`[syncOrderFulfillment] No line items found for order ${orderId} (checked order_lines table and items JSON)`);
      return { success: false, error: "No line items found" };
    }
    console.log(`[syncOrderFulfillment] Found ${lines.length} line item(s) for order ${orderId} (source: ${source})`);

    // Process each line item
    let totalFulfilled = 0;
    for (const line of lines as OrderLine[]) {
      console.log(`[syncOrderFulfillment] Processing line: SKU=${line.sku}, product_id=${line.product_id}, qty=${line.quantity}`);
      
      if (!line.product_id) {
        console.log(`[syncOrderFulfillment] ⚠️ SKIPPING line ${line.sku} - no product_id! Attempting to resolve by SKU...`);
        
        // Try to resolve product_id by SKU
        const { data: productBySku } = await supabase
          .from("products")
          .select("id")
          .eq("sku", line.sku)
          .single();
        
        if (productBySku) {
          console.log(`[syncOrderFulfillment] ✅ Resolved product_id ${productBySku.id} for SKU ${line.sku}`);
          line.product_id = productBySku.id;
        } else {
          console.log(`[syncOrderFulfillment] ❌ Could not resolve product_id for SKU ${line.sku} - skipping`);
          continue;
        }
      }

      // Get current product state
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", line.product_id)
        .single();

      if (productError || !product) {
        console.error(`[syncOrderFulfillment] Product not found: ${line.product_id}`);
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
        console.error(`[syncOrderFulfillment] Failed to create ORDER_FULFILLED transaction for SKU ${line.sku}:`, transactionError);
        return { success: false, error: `Transaction creation failed: ${transactionError.message}` };
      }
      console.log(`[syncOrderFulfillment] Created ORDER_FULFILLED transaction for SKU ${line.sku} (qty: -${line.quantity})`);

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
        console.error(`[syncOrderFulfillment] Failed to update product stock for ${line.sku}:`, updateError);
        continue;
      }
      console.log(`[syncOrderFulfillment] Updated product ${line.sku}: qty_in_stock ${quantityBefore} -> ${quantityAfter}, allocated ${allocatedBefore} -> ${allocatedAfter}`);

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
              related_entity_id: line.product_id ?? undefined,
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
              related_entity_id: line.product_id ?? undefined,
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
              related_entity_id: line.product_id ?? undefined,
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
    console.log(`[syncOrderCancellation] Starting cancellation for order ${orderId}`);
    // Use admin client to bypass RLS for system operations
    const supabase = createAdminClient();

    // Get order details (include items for fallback)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, brand_id, items")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.log(`[syncOrderCancellation] Order ${orderId} not found:`, orderError);
      return { success: false, error: "Order not found" };
    }
    console.log(`[syncOrderCancellation] Found order ${order.order_number} (brand: ${order.brand_id})`);

    // Get order lines (with fallback to items JSON)
    const { lines, source } = await getOrderLinesOrFallback(supabase, orderId, order.items);

    if (!lines || lines.length === 0) {
      console.log(`[syncOrderCancellation] No line items found for order ${orderId} (checked order_lines table and items JSON)`);
      return { success: false, error: "No line items found" };
    }
    console.log(`[syncOrderCancellation] Found ${lines.length} line item(s) for order ${orderId} (source: ${source})`);

    // Process each line item
    for (const line of lines as OrderLine[]) {
      console.log(`[syncOrderCancellation] Processing line: SKU=${line.sku}, product_id=${line.product_id}, qty=${line.quantity}`);
      
      if (!line.product_id) {
        console.log(`[syncOrderCancellation] ⚠️ SKIPPING line ${line.sku} - no product_id! Attempting to resolve by SKU...`);
        
        // Try to resolve product_id by SKU
        const { data: productBySku } = await supabase
          .from("products")
          .select("id")
          .eq("sku", line.sku)
          .single();
        
        if (productBySku) {
          console.log(`[syncOrderCancellation] ✅ Resolved product_id ${productBySku.id} for SKU ${line.sku}`);
          line.product_id = productBySku.id;
        } else {
          console.log(`[syncOrderCancellation] ❌ Could not resolve product_id for SKU ${line.sku} - skipping`);
          continue;
        }
      }

      // Get current product state
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", line.product_id)
        .single();

      if (productError || !product) {
        console.error(`[syncOrderCancellation] Product not found: ${line.product_id}`);
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
        console.error(`[syncOrderCancellation] Failed to create ORDER_CANCELLED transaction for SKU ${line.sku}:`, transactionError);
        return { success: false, error: `Transaction creation failed: ${transactionError.message}` };
      }
      console.log(`[syncOrderCancellation] Created ORDER_CANCELLED transaction for SKU ${line.sku}`);

      // Update allocated stock
      const { error: updateError } = await supabase
        .from("products")
        .update({
          allocated_stock: allocatedAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", line.product_id);

      if (updateError) {
        console.error(`[syncOrderCancellation] Failed to update allocated stock for ${line.sku}:`, updateError);
      } else {
        console.log(`[syncOrderCancellation] Released allocation for ${line.sku}: ${allocatedBefore} -> ${allocatedAfter}`);
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

