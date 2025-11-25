import { createClient } from "@/lib/supabase/server";
import { deductStock, shouldTriggerLowStockAlert } from "@/lib/inventory/stock-checker";
import { PurchaseOrderLine } from "@/types/purchase-orders";

interface OrderGenerationResult {
  success: boolean;
  orderIds: string[];
  error?: string;
  lowStockAlerts?: Array<{ product_id: string; sku: string; stock: number }>;
}

interface GroupedLines {
  [key: string]: PurchaseOrderLine[];
}

/**
 * Generate orders from approved PO lines
 */
export async function generateOrdersFromPO(
  poId: string,
  userId: string
): Promise<OrderGenerationResult> {
  const supabase = await createClient();

  try {
    // Get PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return { success: false, orderIds: [], error: "Purchase order not found" };
    }

    // Get approved lines
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", poId)
      .in("line_status", ["approved", "partially_approved"]);

    if (linesError) {
      return { success: false, orderIds: [], error: "Failed to fetch PO lines" };
    }

    if (!lines || lines.length === 0) {
      return { success: false, orderIds: [], error: "No approved lines to process" };
    }

    // Group lines by order (for now, all in one order)
    const groupedLines = groupLinesByOrder(lines);

    const orderIds: string[] = [];
    const lowStockAlerts: Array<{ product_id: string; sku: string; stock: number }> = [];

    // Create orders for each group
    for (const [groupKey, groupLines] of Object.entries(groupedLines)) {
      const orderResult = await createOrderFromLines(
        poId,
        po,
        groupLines,
        userId
      );

      if (orderResult.success && orderResult.orderId) {
        orderIds.push(orderResult.orderId);
      }

      if (orderResult.lowStockAlerts) {
        lowStockAlerts.push(...orderResult.lowStockAlerts);
      }
    }

    // Update PO status to ordered
    await supabase
      .from("purchase_orders")
      .update({
        po_status: "ordered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", poId);

    return {
      success: true,
      orderIds,
      lowStockAlerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined,
    };
  } catch (error) {
    console.error("Error generating orders from PO:", error);
    return {
      success: false,
      orderIds: [],
      error: "Failed to generate orders",
    };
  }
}

/**
 * Group lines by order criteria (currently all in one order)
 */
export function groupLinesByOrder(lines: PurchaseOrderLine[]): GroupedLines {
  // For now, all lines go into one order
  // Future: could group by distributor, customer, delivery date, etc.
  return {
    default: lines,
  };
}

/**
 * Create a single order from grouped lines
 */
export async function createOrderFromLines(
  poId: string,
  po: any,
  lines: PurchaseOrderLine[],
  userId: string
): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
  lowStockAlerts?: Array<{ product_id: string; sku: string; stock: number }>;
}> {
  const supabase = await createClient();

  try {
    // Calculate order totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const line of lines) {
      const lineTotal = line.approved_qty * line.unit_price;
      subtotal += lineTotal;

      orderItems.push({
        sku: line.sku,
        product_name: line.product_name,
        quantity: line.approved_qty,
        unit_price: line.unit_price,
        total: lineTotal,
      });
    }

    // Create order header
    const orderData = {
      order_number: `ORD-${Date.now()}`,
      order_date: new Date().toISOString(),
      user_id: userId,
      brand_id: po.brand_id,
      distributor_id: po.distributor_id,
      purchase_order_id: poId,
      customer_name: po.supplier_name, // Using supplier as customer for now
      items: orderItems,
      subtotal,
      total_amount: subtotal, // Simplified, could add tax/shipping
      currency: po.currency || "USD",
      order_status: "pending",
      payment_status: "pending",
      created_by: userId,
      updated_by: userId,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return { success: false, error: "Failed to create order" };
    }

    // Create order lines and deduct inventory
    const lowStockAlerts: Array<{ product_id: string; sku: string; stock: number }> = [];

    for (const line of lines) {
      // Create order line
      const orderLineData = {
        order_id: order.id,
        source_po_line_id: line.id,
        product_id: line.product_id,
        sku: line.sku,
        product_name: line.product_name,
        quantity: line.approved_qty,
        unit_price: line.unit_price,
        currency: line.currency || po.currency || "USD",
      };

      await supabase.from("order_lines").insert(orderLineData);

      // Deduct inventory if product exists
      if (line.product_id) {
        const deductResult = await deductStock(
          line.product_id,
          line.approved_qty
        );

        if (!deductResult.success) {
          console.error(
            `Failed to deduct stock for product ${line.product_id}:`,
            deductResult.error
          );
        } else if (deductResult.newStock !== undefined) {
          // Check if low stock alert should be triggered
          const { data: product } = await supabase
            .from("products")
            .select("reorder_level")
            .eq("id", line.product_id)
            .single();

          if (
            product &&
            shouldTriggerLowStockAlert(deductResult.newStock, product.reorder_level)
          ) {
            lowStockAlerts.push({
              product_id: line.product_id,
              sku: line.sku,
              stock: deductResult.newStock,
            });
          }
        }
      }
    }

    return {
      success: true,
      orderId: order.id,
      lowStockAlerts: lowStockAlerts.length > 0 ? lowStockAlerts : undefined,
    };
  } catch (error) {
    console.error("Error creating order from lines:", error);
    return { success: false, error: "Failed to create order" };
  }
}

/**
 * Link order to PO (already done via purchase_order_id, but can add more metadata)
 */
export async function linkOrderToPO(orderId: string, poId: string): Promise<void> {
  // Already linked via purchase_order_id field
  // This function can be used for additional metadata if needed
  const supabase = await createClient();

  await supabase
    .from("orders")
    .update({
      notes: `Generated from PO ${poId}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
}

