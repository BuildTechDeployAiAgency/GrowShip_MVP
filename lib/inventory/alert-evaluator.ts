// ================================================
// INVENTORY ALERT EVALUATOR
// ================================================
// Evaluates stock thresholds and triggers alerts

import { createClient } from "@/lib/supabase/server";
import { createLowStockAlert, createStockRestoredAlert, createOverstockAlert } from "@/lib/notifications/inventory-alerts";

export type AlertLevel = "critical" | "low" | "overstock" | "healthy";

export interface ThresholdEvaluation {
  product_id: string;
  sku: string;
  product_name: string;
  current_stock: number;
  available_stock: number;
  alert_level: AlertLevel;
  threshold_value: number;
  previous_alert_level?: AlertLevel;
  alert_triggered: boolean;
}

/**
 * Evaluate thresholds for a single product
 */
export async function evaluateStockThresholds(
  productId: string,
  previousAlertLevel?: AlertLevel
): Promise<ThresholdEvaluation | null> {
  const supabase = await createClient();

  // Get product with threshold configuration
  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !product) {
    console.error("Product not found:", productId);
    return null;
  }

  // Skip if alerts are disabled for this product
  if (!product.enable_stock_alerts) {
    return null;
  }

  const currentStock = product.quantity_in_stock || 0;
  const availableStock = product.available_stock || 0;
  const lowThreshold = product.low_stock_threshold || 0;
  const criticalThreshold = product.critical_stock_threshold || 0;
  const maxThreshold = product.max_stock_threshold;

  // Determine current alert level
  let currentAlertLevel: AlertLevel;
  let thresholdValue: number;

  if (currentStock === 0) {
    currentAlertLevel = "critical";
    thresholdValue = 0;
  } else if (currentStock <= criticalThreshold) {
    currentAlertLevel = "critical";
    thresholdValue = criticalThreshold;
  } else if (currentStock <= lowThreshold) {
    currentAlertLevel = "low";
    thresholdValue = lowThreshold;
  } else if (maxThreshold && currentStock >= maxThreshold) {
    currentAlertLevel = "overstock";
    thresholdValue = maxThreshold;
  } else {
    currentAlertLevel = "healthy";
    thresholdValue = 0;
  }

  // Check if alert level changed
  const alertTriggered = previousAlertLevel !== undefined && previousAlertLevel !== currentAlertLevel;

  // Create notification if alert level changed
  if (alertTriggered) {
    if (currentAlertLevel === "critical" || currentAlertLevel === "low") {
      await createLowStockAlert(productId, currentAlertLevel);
    } else if (currentAlertLevel === "healthy" && (previousAlertLevel === "critical" || previousAlertLevel === "low")) {
      await createStockRestoredAlert(productId);
    } else if (currentAlertLevel === "overstock") {
      await createOverstockAlert(productId);
    }
  }

  return {
    product_id: productId,
    sku: product.sku,
    product_name: product.product_name,
    current_stock: currentStock,
    available_stock: availableStock,
    alert_level: currentAlertLevel,
    threshold_value: thresholdValue,
    previous_alert_level: previousAlertLevel,
    alert_triggered: alertTriggered,
  };
}

/**
 * Check all products for a brand and evaluate thresholds
 */
export async function checkAllProductThresholds(
  brandId: string
): Promise<ThresholdEvaluation[]> {
  const supabase = await createClient();

  // Get all products needing threshold check
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, product_name, quantity_in_stock, available_stock, low_stock_threshold, critical_stock_threshold, max_stock_threshold")
    .eq("brand_id", brandId)
    .eq("status", "active")
    .eq("enable_stock_alerts", true);

  if (error || !products) {
    console.error("Failed to fetch products:", error);
    return [];
  }

  const evaluations: ThresholdEvaluation[] = [];

  for (const product of products) {
    const currentStock = product.quantity_in_stock || 0;
    const availableStock = product.available_stock || 0;
    const lowThreshold = product.low_stock_threshold || 0;
    const criticalThreshold = product.critical_stock_threshold || 0;
    const maxThreshold = product.max_stock_threshold;

    let alertLevel: AlertLevel;
    let thresholdValue: number;

    if (currentStock === 0) {
      alertLevel = "critical";
      thresholdValue = 0;
    } else if (currentStock <= criticalThreshold) {
      alertLevel = "critical";
      thresholdValue = criticalThreshold;
    } else if (currentStock <= lowThreshold) {
      alertLevel = "low";
      thresholdValue = lowThreshold;
    } else if (maxThreshold && currentStock >= maxThreshold) {
      alertLevel = "overstock";
      thresholdValue = maxThreshold;
    } else {
      alertLevel = "healthy";
      thresholdValue = 0;
    }

    // Only include products with alerts (not healthy)
    if (alertLevel !== "healthy") {
      evaluations.push({
        product_id: product.id,
        sku: product.sku,
        product_name: product.product_name,
        current_stock: currentStock,
        available_stock: availableStock,
        alert_level: alertLevel,
        threshold_value: thresholdValue,
        alert_triggered: false, // This function doesn't track previous state
      });
    }
  }

  return evaluations;
}

/**
 * Get products at specific alert level
 */
export async function getProductsByAlertLevel(
  brandId: string,
  alertLevel: AlertLevel
): Promise<ThresholdEvaluation[]> {
  const allEvaluations = await checkAllProductThresholds(brandId);
  return allEvaluations.filter((e) => e.alert_level === alertLevel);
}

/**
 * Calculate days until out of stock based on recent sales velocity
 */
export async function calculateDaysUntilOutOfStock(
  productId: string,
  daysToAnalyze: number = 30
): Promise<number | null> {
  const supabase = await createClient();

  // Get product current stock
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("quantity_in_stock, sku, brand_id")
    .eq("id", productId)
    .single();

  if (productError || !product || product.quantity_in_stock <= 0) {
    return null;
  }

  // Get recent fulfilled orders for this product
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysToAnalyze);

  const { data: transactions, error: transError } = await supabase
    .from("inventory_transactions")
    .select("quantity_change, transaction_date")
    .eq("product_id", productId)
    .eq("transaction_type", "ORDER_FULFILLED")
    .gte("transaction_date", dateFrom.toISOString())
    .order("transaction_date", { ascending: false });

  if (transError || !transactions || transactions.length === 0) {
    return null; // No recent sales data
  }

  // Calculate average daily consumption
  const totalConsumed = transactions.reduce((sum, t) => sum + Math.abs(t.quantity_change), 0);
  const averageDailyConsumption = totalConsumed / daysToAnalyze;

  if (averageDailyConsumption === 0) {
    return null; // No consumption
  }

  // Calculate days until out of stock
  const daysUntilOut = product.quantity_in_stock / averageDailyConsumption;

  return Math.ceil(daysUntilOut);
}

/**
 * Get products that will run out soon (within specified days)
 */
export async function getProductsRunningOutSoon(
  brandId: string,
  withinDays: number = 7
): Promise<Array<{
  product_id: string;
  sku: string;
  product_name: string;
  current_stock: number;
  days_until_out: number;
}>> {
  const supabase = await createClient();

  // Get all active products for the brand
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, product_name, quantity_in_stock")
    .eq("brand_id", brandId)
    .eq("status", "active")
    .gt("quantity_in_stock", 0);

  if (error || !products) {
    console.error("Failed to fetch products:", error);
    return [];
  }

  const runningOutSoon: Array<{
    product_id: string;
    sku: string;
    product_name: string;
    current_stock: number;
    days_until_out: number;
  }> = [];

  for (const product of products) {
    const daysUntilOut = await calculateDaysUntilOutOfStock(product.id);
    
    if (daysUntilOut !== null && daysUntilOut <= withinDays) {
      runningOutSoon.push({
        product_id: product.id,
        sku: product.sku,
        product_name: product.product_name,
        current_stock: product.quantity_in_stock,
        days_until_out: daysUntilOut,
      });
    }
  }

  // Sort by days until out (ascending)
  runningOutSoon.sort((a, b) => a.days_until_out - b.days_until_out);

  return runningOutSoon;
}

