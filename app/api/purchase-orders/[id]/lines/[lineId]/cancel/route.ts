import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApprovalPermission } from "@/lib/po/approval-permissions";

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
    const { reason } = body;

    // Validate approval permission (same permission needed to cancel)
    const approvalCheck = await validateApprovalPermission(user.id, poId);
    if (!approvalCheck.allowed) {
      return NextResponse.json(
        { error: approvalCheck.reason },
        { status: 403 }
      );
    }

    // Update the line item to cancelled
    const { data: updatedLine, error: updateError } = await supabase
      .from("purchase_order_lines")
      .update({
        line_status: "cancelled",
        line_notes: reason || "Line cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lineId)
      .eq("purchase_order_id", poId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to cancel line item" },
        { status: 500 }
      );
    }

    // Create history entry
    await supabase.from("po_approval_history").insert({
      po_id: poId,
      action: "cancelled",
      actor_id: user.id,
      comments: reason || `Line ${lineId} cancelled`,
      affected_line_ids: [lineId],
    });

    // Check if all lines are cancelled
    const { data: allLines } = await supabase
      .from("purchase_order_lines")
      .select("line_status")
      .eq("purchase_order_id", poId);

    const allCancelled = allLines?.every(
      (line) => line.line_status === "cancelled"
    );

    // If all lines cancelled, cancel the entire PO
    if (allCancelled) {
      await supabase
        .from("purchase_orders")
        .update({
          po_status: "cancelled",
          rejection_reason: "All line items cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", poId);
    }

    return NextResponse.json({
      line: updatedLine,
      po_cancelled: allCancelled,
      message: "Line item cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling line item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

