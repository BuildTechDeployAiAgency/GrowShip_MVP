import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApprovalPermission, validateOverridePermission } from "@/lib/po/approval-permissions";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const { id, lineId } = await context.params;
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
      approved_qty,
      backorder_qty = 0,
      rejected_qty = 0,
      override_applied = false,
      override_reason,
      notes,
    } = body;

    // Validate approval permission
    const approvalCheck = await validateApprovalPermission(user.id, poId);
    if (!approvalCheck.allowed) {
      return NextResponse.json(
        { error: approvalCheck.reason },
        { status: 403 }
      );
    }

    // If override is requested, check override permission
    if (override_applied) {
      const overrideCheck = await validateOverridePermission(user.id);
      if (!overrideCheck.allowed) {
        return NextResponse.json(
          { error: overrideCheck.reason },
          { status: 403 }
        );
      }

      if (!override_reason || override_reason.trim() === "") {
        return NextResponse.json(
          { error: "Override reason is required" },
          { status: 400 }
        );
      }
    }

    // Get the line item
    const { data: line, error: lineError } = await supabase
      .from("purchase_order_lines")
      .select("*, purchase_orders!inner(brand_id, po_status)")
      .eq("id", lineId)
      .eq("purchase_order_id", poId)
      .single();

    if (lineError || !line) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 }
      );
    }

    // Validate quantities
    const requestedQty = line.requested_qty || line.quantity || 0;
    if (approved_qty + backorder_qty + rejected_qty !== requestedQty) {
      return NextResponse.json(
        {
          error: `Total quantities must equal requested quantity (${requestedQty})`,
        },
        { status: 400 }
      );
    }

    // Check stock if no override
    if (!override_applied && line.available_stock !== null) {
      if (approved_qty > line.available_stock) {
        return NextResponse.json(
          {
            error: `Approved quantity (${approved_qty}) exceeds available stock (${line.available_stock}). Use override to approve anyway.`,
          },
          { status: 400 }
        );
      }
    }

    // Determine line status
    let lineStatus: string;
    if (rejected_qty === requestedQty) {
      lineStatus = "rejected";
    } else if (backorder_qty === requestedQty) {
      lineStatus = "backordered";
    } else if (approved_qty === requestedQty) {
      lineStatus = "approved";
    } else {
      lineStatus = "partially_approved";
    }

    // Update the line item
    const updateData: any = {
      approved_qty,
      backorder_qty,
      rejected_qty,
      line_status: lineStatus,
      override_applied,
      line_notes: notes,
      updated_at: new Date().toISOString(),
    };

    if (override_applied) {
      updateData.override_by = user.id;
      updateData.override_reason = override_reason;
      updateData.override_at = new Date().toISOString();
    }

    const { data: updatedLine, error: updateError } = await supabase
      .from("purchase_order_lines")
      .update(updateData)
      .eq("id", lineId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating line:", updateError);
      return NextResponse.json(
        { error: "Failed to update line item" },
        { status: 500 }
      );
    }

    // Create approval history entry
    await supabase.from("po_approval_history").insert({
      po_id: poId,
      action: "approved",
      actor_id: user.id,
      comments: notes || `Line ${lineId}: ${lineStatus}`,
      affected_line_ids: [lineId],
      override_applied,
      stock_warnings: !override_applied ? null : {
        line_id: lineId,
        available_stock: line.available_stock,
        approved_qty,
        override_reason,
      },
    });

    return NextResponse.json({
      line: updatedLine,
      message: "Line item approved successfully",
    });
  } catch (error) {
    console.error("Error approving line item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

