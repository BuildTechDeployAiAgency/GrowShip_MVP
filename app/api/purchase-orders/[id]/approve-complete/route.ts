import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApprovalPermission } from "@/lib/po/approval-permissions";
import { finalizeApproval } from "@/lib/po/workflow-engine";
import { generateOrdersFromPO } from "@/lib/orders/order-generator";
import { createBackorderRecord, generateBackorderAlert } from "@/lib/orders/backorder-manager";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const poId = id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      create_orders = true,
      comments,
    }: { create_orders?: boolean; comments?: string } = body;

    // Validate approval permission
    const approvalCheck = await validateApprovalPermission(user.id, poId);
    if (!approvalCheck.allowed) {
      return NextResponse.json(
        { error: approvalCheck.reason },
        { status: 403 }
      );
    }

    // Get PO details
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("po_number, brand_id")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Finalize the approval
    const finalizeResult = await finalizeApproval(poId, user.id);
    if (!finalizeResult.success) {
      return NextResponse.json(
        { error: finalizeResult.error },
        { status: 400 }
      );
    }

    // Get all lines with backorders
    const { data: lines } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", poId);

    const backorderLines = lines?.filter((line) => line.backorder_qty > 0) || [];

    // Create backorder records
    const backorderIds: string[] = [];
    for (const line of backorderLines) {
      const backorderResult = await createBackorderRecord(
        poId,
        line.id,
        line.product_id,
        line.sku,
        line.backorder_qty,
        undefined, // Could calculate expected date based on lead time
        user.id
      );

      if (backorderResult.success && backorderResult.backorder) {
        backorderIds.push(backorderResult.backorder.id);

        // Generate backorder alert
        await generateBackorderAlert(
          backorderResult.backorder.id,
          po.po_number,
          po.brand_id,
          user.id
        );
      }
    }

    // Create orders if requested
    let orderIds: string[] = [];
    if (create_orders) {
      const orderResult = await generateOrdersFromPO(poId, user.id);
      if (orderResult.success) {
        orderIds = orderResult.orderIds;

        // Create low stock alerts if needed
        if (orderResult.lowStockAlerts && orderResult.lowStockAlerts.length > 0) {
          for (const alert of orderResult.lowStockAlerts) {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "inventory",
              title: "Low Stock Alert",
              message: `Product ${alert.sku} is now at low stock level (${alert.stock} units)`,
              brand_id: po.brand_id,
              related_entity_type: "product",
              related_entity_id: alert.product_id,
              priority: "high",
              action_required: true,
              is_read: false,
            });
          }
        }
      }
    }

    // Create approval notification
    const fulfillmentPct = finalizeResult.po?.fulfillment_percentage || 0;
    let notificationTitle = "Purchase Order Approved";
    let notificationMessage = `Purchase Order ${po.po_number} has been approved`;
    let notificationPriority: "low" | "medium" | "high" = "medium";

    if (fulfillmentPct < 100) {
      notificationTitle = "Purchase Order Partially Approved";
      notificationMessage = `Purchase Order ${po.po_number} has been partially approved (${fulfillmentPct}% fulfillment)`;
      notificationPriority = "high";
    }

    // Notify PO creator
    const { data: poData } = await supabase
      .from("purchase_orders")
      .select("user_id")
      .eq("id", poId)
      .single();

    if (poData?.user_id) {
      await supabase.from("notifications").insert({
        user_id: poData.user_id,
        type: "order",
        title: notificationTitle,
        message: notificationMessage,
        brand_id: po.brand_id,
        related_entity_type: "po",
        related_entity_id: poId,
        priority: notificationPriority,
        action_required: false,
        action_url: `/purchase-orders/${poId}`,
        is_read: false,
      });
    }

    // Create calendar events if expected delivery date exists
    if (finalizeResult.po?.expected_delivery_date) {
      try {
        await supabase.from("calendar_events").insert({
          title: `PO Delivery: ${po.po_number}`,
          description: `Expected delivery for Purchase Order ${po.po_number}`,
          event_date: finalizeResult.po.expected_delivery_date,
          event_type: "po_delivery",
          brand_id: po.brand_id,
          related_entity_type: "po",
          related_entity_id: poId,
          created_by: user.id,
        });
      } catch (calError) {
        console.error("Error creating calendar event:", calError);
        // Don't fail the approval if calendar creation fails
      }
    }

    // Update approval history with generated order IDs and backorder references
    if (orderIds.length > 0 || backorderIds.length > 0) {
      const { data: lastHistory } = await supabase
        .from("po_approval_history")
        .select("id")
        .eq("po_id", poId)
        .eq("actor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastHistory) {
        await supabase
          .from("po_approval_history")
          .update({
            generated_order_ids: orderIds,
            backorder_references: {
              backorder_ids: backorderIds,
              total_backordered: backorderLines.length,
            },
          })
          .eq("id", lastHistory.id);
      }
    }

    return NextResponse.json({
      success: true,
      po: finalizeResult.po,
      orders_created: orderIds.length,
      order_ids: orderIds,
      backorders_created: backorderIds.length,
      backorder_ids: backorderIds,
      fulfillment_percentage: fulfillmentPct,
      message: "Purchase order approved successfully",
    });
  } catch (error) {
    console.error("Error completing PO approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

