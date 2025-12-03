// ================================================
// INVENTORY ALERTS NOTIFICATION SERVICE
// ================================================
// Creates notifications for inventory threshold events

import { createClient } from "@/lib/supabase/server";
import { createNotificationsForBrand } from "./alert-generator";

export type InventoryAlertLevel = "critical" | "low" | "overstock";

/**
 * Create low or critical stock alert notification
 */
export async function createLowStockAlert(
  productId: string,
  level: InventoryAlertLevel
): Promise<void> {
  const supabase = await createClient();

  // Get product details
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Product not found for alert:", productId);
    return;
  }

  const currentStock = product.quantity_in_stock || 0;
  const availableStock = product.available_stock || 0;
  const threshold = level === "critical" ? product.critical_stock_threshold : product.low_stock_threshold;

  // Determine priority based on level
  const priority = level === "critical" ? "urgent" : "high";
  const title = level === "critical" 
    ? currentStock === 0 ? "Product Out of Stock" : "Critical Stock Level"
    : "Low Stock Alert";

  // Create notification message
  let message = `${product.product_name} (${product.sku})`;
  if (currentStock === 0) {
    message += " is out of stock";
  } else {
    message += ` has ${currentStock} units remaining`;
    if (availableStock < currentStock) {
      message += ` (${availableStock} available after allocations)`;
    }
  }

  // Create notification for all brand users
  await createNotificationsForBrand(
    {
      type: "warning",
      title,
      message,
      related_entity_type: "inventory",
      related_entity_id: productId,
      priority,
      action_required: true,
      action_url: `/products/${productId}`,
    },
    product.brand_id
  );

  // Also create calendar event for restock reminder if critically low
  if (level === "critical" && currentStock > 0) {
    const restockDate = new Date();
    restockDate.setDate(restockDate.getDate() + 3); // Suggest restock in 3 days

    await supabase.from("calendar_events").insert({
      brand_id: product.brand_id,
      event_type: "custom",
      title: `Restock Reminder: ${product.product_name}`,
      description: `${product.product_name} (${product.sku}) is at critical stock level (${currentStock} units). Consider reordering.`,
      event_date: restockDate.toISOString().split("T")[0],
      related_entity_type: "inventory",
      related_entity_id: productId,
      is_all_day: true,
      status: "upcoming",
      created_by: null, // System-generated
    });
  }
}

/**
 * Create stock restored notification (when stock goes from low/critical to healthy)
 */
export async function createStockRestoredAlert(productId: string): Promise<void> {
  const supabase = await createClient();

  // Get product details
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Product not found for alert:", productId);
    return;
  }

  const currentStock = product.quantity_in_stock || 0;

  // Create success notification
  await createNotificationsForBrand(
    {
      type: "success",
      title: "Stock Replenished",
      message: `${product.product_name} (${product.sku}) stock has been replenished to ${currentStock} units`,
      related_entity_type: "inventory",
      related_entity_id: productId,
      priority: "low",
      action_required: false,
      action_url: `/products/${productId}`,
    },
    product.brand_id
  );

  // Remove any pending restock reminders from calendar
  await supabase
    .from("calendar_events")
    .delete()
    .eq("related_entity_type", "inventory")
    .eq("related_entity_id", productId)
    .eq("status", "upcoming");
}

/**
 * Create overstock alert notification
 */
export async function createOverstockAlert(productId: string): Promise<void> {
  const supabase = await createClient();

  // Get product details
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !product || !product.max_stock_threshold) {
    return;
  }

  const currentStock = product.quantity_in_stock || 0;
  const overstockAmount = currentStock - product.max_stock_threshold;

  // Create warning notification
  await createNotificationsForBrand(
    {
      type: "warning",
      title: "Overstock Alert",
      message: `${product.product_name} (${product.sku}) has ${currentStock} units, which is ${overstockAmount} units over the maximum threshold (${product.max_stock_threshold})`,
      related_entity_type: "inventory",
      related_entity_id: productId,
      priority: "medium",
      action_required: false,
      action_url: `/products/${productId}`,
    },
    product.brand_id
  );
}

/**
 * Create notification for products running out soon (predictive alert)
 */
export async function createRunningOutSoonAlert(
  productId: string,
  daysUntilOut: number
): Promise<void> {
  const supabase = await createClient();

  // Get product details
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Product not found for alert:", productId);
    return;
  }

  const currentStock = product.quantity_in_stock || 0;

  // Create predictive warning
  await createNotificationsForBrand(
    {
      type: "warning",
      title: "Stock Running Out Soon",
      message: `${product.product_name} (${product.sku}) has ${currentStock} units and is projected to run out in approximately ${daysUntilOut} days based on recent sales velocity`,
      related_entity_type: "inventory",
      related_entity_id: productId,
      priority: "high",
      action_required: true,
      action_url: `/products/${productId}`,
    },
    product.brand_id
  );

  // Create calendar event for predicted stock-out date
  const stockOutDate = new Date();
  stockOutDate.setDate(stockOutDate.getDate() + daysUntilOut);

  await supabase.from("calendar_events").insert({
    brand_id: product.brand_id,
    event_type: "custom",
    title: `Predicted Stock-Out: ${product.product_name}`,
    description: `${product.product_name} (${product.sku}) is projected to run out of stock on this date based on recent sales trends.`,
    event_date: stockOutDate.toISOString().split("T")[0],
    related_entity_type: "inventory",
    related_entity_id: productId,
    is_all_day: true,
    status: "upcoming",
    created_by: null, // System-generated
  });
}

/**
 * Batch create alerts for multiple products
 */
export async function createBatchStockAlerts(
  alerts: Array<{
    product_id: string;
    alert_type: "low" | "critical" | "overstock" | "running_out_soon";
    days_until_out?: number;
  }>
): Promise<void> {
  for (const alert of alerts) {
    try {
      if (alert.alert_type === "running_out_soon" && alert.days_until_out) {
        await createRunningOutSoonAlert(alert.product_id, alert.days_until_out);
      } else if (alert.alert_type === "overstock") {
        await createOverstockAlert(alert.product_id);
      } else if (alert.alert_type === "low" || alert.alert_type === "critical") {
        await createLowStockAlert(alert.product_id, alert.alert_type);
      }
    } catch (error) {
      console.error(`Failed to create alert for product ${alert.product_id}:`, error);
    }
  }
}

/**
 * Check inventory alerts for all products in a brand
 * This function evaluates thresholds and creates alerts as needed
 * Also includes predictive stock-out alerts based on sales velocity
 */
export async function checkInventoryAlerts(brandId: string): Promise<void> {
  const { checkAllProductThresholds, evaluateStockThresholds, getProductsRunningOutSoon } = await import("@/lib/inventory/alert-evaluator");
  const supabase = await createClient();

  // Get all products that need threshold evaluation
  const evaluations = await checkAllProductThresholds(brandId);

  // For each product with an alert level, check if we need to create/update alerts
  for (const evaluation of evaluations) {
    try {
      // Get previous alert level from notifications to track state changes
      const { data: recentAlert } = await supabase
        .from("notifications")
        .select("metadata")
        .eq("related_entity_type", "inventory")
        .eq("related_entity_id", evaluation.product_id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const previousAlertLevel = recentAlert?.metadata?.alert_level as InventoryAlertLevel | undefined;

      // Evaluate thresholds and create alerts if needed
      await evaluateStockThresholds(
        evaluation.product_id,
        previousAlertLevel as any // Convert to AlertLevel type
      );
    } catch (error) {
      console.error(`Error checking alerts for product ${evaluation.product_id}:`, error);
    }
  }

  console.log(`Checked inventory alerts for brand ${brandId}: ${evaluations.length} products evaluated`);

  // ================================================
  // PREDICTIVE STOCK-OUT ALERTS (Out-of-Stock Risk)
  // ================================================
  // Check for products that will run out soon based on sales velocity
  try {
    const runningOutSoon = await getProductsRunningOutSoon(brandId, 7); // Products running out within 7 days

    for (const product of runningOutSoon) {
      // Check if we already sent a "running out soon" alert for this product recently (within 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: existingAlert } = await supabase
        .from("notifications")
        .select("id")
        .eq("related_entity_type", "inventory")
        .eq("related_entity_id", product.product_id)
        .ilike("title", "%Running Out Soon%")
        .gte("created_at", threeDaysAgo.toISOString())
        .limit(1)
        .maybeSingle();

      // Skip if we already sent an alert recently
      if (existingAlert) {
        continue;
      }

      // Create the predictive alert
      await createRunningOutSoonAlert(product.product_id, product.days_until_out);
    }

    console.log(`Checked predictive stock-out alerts for brand ${brandId}: ${runningOutSoon.length} products at risk`);
  } catch (error) {
    console.error(`Error checking predictive stock-out alerts for brand ${brandId}:`, error);
  }
}

/**
 * Clean up old inventory-related notifications
 * Should be called periodically (e.g., daily cron job)
 */
export async function cleanupOldInventoryAlerts(olderThanDays: number = 30): Promise<void> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  // Delete old read inventory notifications
  await supabase
    .from("notifications")
    .delete()
    .eq("related_entity_type", "inventory")
    .eq("is_read", true)
    .lt("created_at", cutoffDate.toISOString());

  console.log(`Cleaned up inventory notifications older than ${olderThanDays} days`);
}
