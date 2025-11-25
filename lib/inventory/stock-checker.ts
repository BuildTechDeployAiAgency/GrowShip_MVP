import { createClient } from "@/lib/supabase/server";
import { StockStatus, StockValidationResult } from "@/types/purchase-orders";

interface StockInfo {
  product_id: string;
  sku: string;
  quantity_in_stock: number;
}

/**
 * Get stock level for a single SKU
 */
export async function getStockForSKU(
  sku: string,
  brandId: string
): Promise<StockInfo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, sku, quantity_in_stock")
    .eq("sku", sku)
    .eq("brand_id", brandId)
    .single();

  if (error || !data) {
    console.error(`Error fetching stock for SKU ${sku}:`, error);
    return null;
  }

  return {
    product_id: data.id,
    sku: data.sku,
    quantity_in_stock: data.quantity_in_stock,
  };
}

/**
 * Get stock levels for multiple SKUs (batch lookup)
 */
export async function getStockForMultipleSKUs(
  skus: string[],
  brandId: string
): Promise<Map<string, StockInfo>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, sku, quantity_in_stock")
    .in("sku", skus)
    .eq("brand_id", brandId);

  if (error) {
    console.error("Error fetching stock for multiple SKUs:", error);
    return new Map();
  }

  const stockMap = new Map<string, StockInfo>();
  data?.forEach((product) => {
    stockMap.set(product.sku, {
      product_id: product.id,
      sku: product.sku,
      quantity_in_stock: product.quantity_in_stock,
    });
  });

  return stockMap;
}

/**
 * Determine stock status based on requested vs available quantity
 */
export function getStockStatus(
  requestedQty: number,
  availableStock: number
): StockStatus {
  if (availableStock >= requestedQty) {
    return "sufficient";
  } else if (availableStock > 0) {
    return "partial";
  } else {
    return "insufficient";
  }
}

/**
 * Validate stock for a single line item
 */
export function validateLineStock(
  lineId: string,
  sku: string,
  requestedQty: number,
  availableStock: number
): StockValidationResult {
  const stockStatus = getStockStatus(requestedQty, availableStock);
  const canApprove = stockStatus === "sufficient";

  let suggestion: StockValidationResult["suggestion"];

  if (stockStatus === "partial") {
    suggestion = {
      type: "split",
      approved_qty: availableStock,
      backorder_qty: requestedQty - availableStock,
      message: `Split into ${availableStock} available now and ${
        requestedQty - availableStock
      } on backorder`,
    };
  } else if (stockStatus === "insufficient") {
    suggestion = {
      type: "override",
      message: "No stock available. Override required to approve.",
    };
  }

  return {
    line_id: lineId,
    sku,
    requested_qty: requestedQty,
    available_stock: availableStock,
    stock_status: stockStatus,
    can_approve: canApprove,
    suggestion,
  };
}

/**
 * Reserve stock for a pending order (optional feature)
 * This prevents overselling during the review period
 */
export async function reserveStock(
  productId: string,
  qty: number,
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  // This could be implemented with a stock_reservations table
  // For now, we'll just validate that stock is available
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("quantity_in_stock")
    .eq("id", productId)
    .single();

  if (error || !product) {
    return { success: false, error: "Product not found" };
  }

  if (product.quantity_in_stock < qty) {
    return { success: false, error: "Insufficient stock to reserve" };
  }

  // TODO: Implement actual reservation logic if needed
  // This would involve creating a record in a stock_reservations table

  return { success: true };
}

/**
 * Release previously reserved stock
 */
export async function releaseStock(
  productId: string,
  qty: number,
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  // TODO: Implement actual release logic if needed
  // This would involve deleting the reservation record

  return { success: true };
}

/**
 * Deduct stock when order is created
 */
export async function deductStock(
  productId: string,
  qty: number
): Promise<{ success: boolean; error?: string; newStock?: number }> {
  const supabase = await createClient();

  // Use a transaction-like update with condition
  const { data, error } = await supabase.rpc("deduct_product_stock", {
    p_product_id: productId,
    p_quantity: qty,
  });

  if (error) {
    // If RPC doesn't exist, fall back to direct update
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("quantity_in_stock")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      return { success: false, error: "Product not found" };
    }

    if (product.quantity_in_stock < qty) {
      return { success: false, error: "Insufficient stock" };
    }

    const newStock = product.quantity_in_stock - qty;

    const { error: updateError } = await supabase
      .from("products")
      .update({ quantity_in_stock: newStock })
      .eq("id", productId)
      .eq("quantity_in_stock", product.quantity_in_stock); // Optimistic locking

    if (updateError) {
      return {
        success: false,
        error: "Failed to update stock (possible race condition)",
      };
    }

    return { success: true, newStock };
  }

  return { success: true, newStock: data };
}

/**
 * Check if stock level triggers low stock alert
 */
export function shouldTriggerLowStockAlert(
  currentStock: number,
  reorderLevel?: number
): boolean {
  if (!reorderLevel) {
    return false;
  }
  return currentStock <= reorderLevel;
}

