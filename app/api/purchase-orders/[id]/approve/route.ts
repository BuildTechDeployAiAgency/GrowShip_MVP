import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPOStatusChangeAlert } from "@/lib/notifications/po-alerts";
import { executeTransition } from "@/lib/po/workflow-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { comments } = body;

    // Get PO details for notification purposes
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("po_number, user_id, brand_id")
      .eq("id", params.id)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Execute workflow transition using the workflow engine
    const result = await executeTransition(
      params.id,
      user.id,
      "approve",
      comments
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to approve purchase order" },
        { status: 400 }
      );
    }

    // Create notification
    await createPOStatusChangeAlert(
      params.id,
      po.po_number,
      "approved",
      po.user_id,
      po.brand_id
    );

    return NextResponse.json({ purchase_order: result.updatedPO });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


