import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTransition } from "@/lib/po/workflow-engine";
import { createPOStatusChangeAlert } from "@/lib/notifications/po-alerts";

export async function POST(
  request: NextRequest,
  context: any
) {
  const { params } = context as { params: { id: string } };
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

    if (!comments || comments.trim() === "") {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Get PO details before rejection
    const { data: po } = await supabase
      .from("purchase_orders")
      .select("po_number, user_id, brand_id")
      .eq("id", params.id)
      .single();

    // Execute workflow transition
    const result = await executeTransition(params.id, user.id, "reject", comments);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Create notification
    if (po) {
      await createPOStatusChangeAlert(
        params.id,
        po.po_number,
        "rejected",
        po.user_id,
        po.brand_id
      );
    }

    return NextResponse.json({ purchase_order: result.updatedPO });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
