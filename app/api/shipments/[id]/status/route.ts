import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name")
      .eq("user_id", user.id)
      .single();

    if (profile?.role_name?.startsWith("distributor_")) {
      return NextResponse.json(
        { error: "Distributor users cannot update shipments" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Call the RPC function to update status
    const { data, error: rpcError } = await supabase.rpc(
      "update_shipment_status",
      {
        p_shipment_id: id,
        p_new_status: status,
        p_user_id: user.id,
        p_notes: notes || null,
      }
    );

    if (rpcError) {
      console.error("Error updating shipment status:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Failed to update shipment status" },
        { status: 500 }
      );
    }

    // The RPC returns a JSONB object
    const result = data as { success: boolean; error?: string; new_status?: string };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update shipment status" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      shipment_id: id,
      new_status: result.new_status,
    });
  } catch (error: any) {
    console.error("Error in shipment status update:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
