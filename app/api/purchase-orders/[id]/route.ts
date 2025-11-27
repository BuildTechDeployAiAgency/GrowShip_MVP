import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTransition, POAction } from "@/lib/po/workflow-engine";
import { createPOApprovalAlert, createPOStatusChangeAlert } from "@/lib/notifications/po-alerts";

/**
 * Map target status to workflow action
 */
function getActionFromStatus(targetStatus: string): POAction | null {
  const statusToAction: Record<string, POAction> = {
    submitted: "submit",
    approved: "approve",
    rejected: "reject",
    ordered: "order",
    received: "receive",
    cancelled: "cancel",
  };
  return statusToAction[targetStatus] || null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { po_status, comments } = body;

    if (!po_status) {
      return NextResponse.json(
        { error: "po_status is required" },
        { status: 400 }
      );
    }

    // Get PO details for notification purposes
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("po_number, user_id, brand_id, po_status")
      .eq("id", id)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Map target status to workflow action
    const action = getActionFromStatus(po_status);
    if (!action) {
      return NextResponse.json(
        { error: `Invalid target status: ${po_status}` },
        { status: 400 }
      );
    }

    // Execute workflow transition using the workflow engine
    const result = await executeTransition(id, user.id, action, comments);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || `Failed to transition to ${po_status}` },
        { status: 400 }
      );
    }

    // Create appropriate notification based on the action
    try {
      if (action === "submit") {
        // Notify approvers that a PO needs approval
        // Pass user.id (submitter) to exclude them from notification
        await createPOApprovalAlert(id, po.po_number, po.brand_id, user.id);
      } else if (["approve", "reject", "order", "receive"].includes(action)) {
        // Notify the PO creator about the status change
        await createPOStatusChangeAlert(
          id,
          po.po_number,
          po_status,
          po.user_id,
          po.brand_id
        );
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error("Error creating notification:", notificationError);
    }

    return NextResponse.json({ purchase_order: result.updatedPO });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/purchase-orders/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

