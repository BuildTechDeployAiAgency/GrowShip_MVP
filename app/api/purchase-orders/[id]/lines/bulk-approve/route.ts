import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApprovalPermission, validateOverridePermission } from "@/lib/po/approval-permissions";
import { LineApprovalDecision } from "@/types/purchase-orders";

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const poId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { line_decisions, comments }: {
      line_decisions: LineApprovalDecision[];
      comments?: string;
    } = body;

    if (!line_decisions || line_decisions.length === 0) {
      return NextResponse.json(
        { error: "No line decisions provided" },
        { status: 400 }
      );
    }

    // Validate approval permission
    const approvalCheck = await validateApprovalPermission(user.id, poId);
    if (!approvalCheck.allowed) {
      return NextResponse.json(
        { error: approvalCheck.reason },
        { status: 403 }
      );
    }

    // Check if any decisions require override
    const hasOverrides = line_decisions.some((d) => d.override_applied);
    if (hasOverrides) {
      const overrideCheck = await validateOverridePermission(user.id);
      if (!overrideCheck.allowed) {
        return NextResponse.json(
          { error: "You do not have permission to override stock restrictions" },
          { status: 403 }
        );
      }
    }

    // Get all lines for this PO
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", poId);

    if (linesError || !lines) {
      return NextResponse.json(
        { error: "Failed to fetch PO lines" },
        { status: 500 }
      );
    }

    // Process each decision
    const results = [];
    const errors = [];
    const affectedLineIds = [];

    for (const decision of line_decisions) {
      try {
        const line = lines.find((l) => l.id === decision.line_id);
        if (!line) {
          errors.push({
            line_id: decision.line_id,
            error: "Line not found",
          });
          continue;
        }

        const requestedQty = line.requested_qty || line.quantity || 0;
        const approvedQty = decision.approved_qty;
        const backorderQty = decision.backorder_qty || 0;
        const rejectedQty = decision.rejected_qty || 0;

        // Validate quantities
        if (approvedQty + backorderQty + rejectedQty !== requestedQty) {
          errors.push({
            line_id: decision.line_id,
            error: `Total quantities must equal requested quantity (${requestedQty})`,
          });
          continue;
        }

        // Check stock if no override
        if (!decision.override_applied && line.available_stock !== null) {
          if (approvedQty > line.available_stock) {
            errors.push({
              line_id: decision.line_id,
              error: `Approved quantity exceeds available stock`,
            });
            continue;
          }
        }

        // Determine line status
        let lineStatus: string;
        if (rejectedQty === requestedQty) {
          lineStatus = "rejected";
        } else if (backorderQty === requestedQty) {
          lineStatus = "backordered";
        } else if (approvedQty === requestedQty) {
          lineStatus = "approved";
        } else {
          lineStatus = "partially_approved";
        }

        // Update the line
        const updateData: any = {
          approved_qty: approvedQty,
          backorder_qty: backorderQty,
          rejected_qty: rejectedQty,
          line_status: lineStatus,
          override_applied: decision.override_applied,
          line_notes: decision.notes,
          updated_at: new Date().toISOString(),
        };

        if (decision.override_applied) {
          updateData.override_by = user.id;
          updateData.override_reason = decision.override_reason;
          updateData.override_at = new Date().toISOString();
        }

        const { data: updatedLine, error: updateError } = await supabase
          .from("purchase_order_lines")
          .update(updateData)
          .eq("id", decision.line_id)
          .select()
          .single();

        if (updateError) {
          errors.push({
            line_id: decision.line_id,
            error: "Failed to update line",
          });
          continue;
        }

        results.push(updatedLine);
        affectedLineIds.push(decision.line_id);
      } catch (err) {
        errors.push({
          line_id: decision.line_id,
          error: "Unexpected error processing line",
        });
      }
    }

    // Create bulk approval history entry
    await supabase.from("po_approval_history").insert({
      po_id: poId,
      action: "approved",
      actor_id: user.id,
      comments: comments || `Bulk approval: ${results.length} lines processed`,
      affected_line_ids: affectedLineIds,
      override_applied: hasOverrides,
    });

    return NextResponse.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Processed ${results.length} line items successfully`,
    });
  } catch (error) {
    console.error("Error bulk approving lines:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

