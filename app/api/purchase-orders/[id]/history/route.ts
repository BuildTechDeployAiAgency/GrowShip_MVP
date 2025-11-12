import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    // Get PO to verify access
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("brand_id")
      .eq("id", params.id)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Get user profile to check brand access
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id")
      .eq("user_id", user.id)
      .single();

    const isSuperAdmin = profile?.role_name === "super_admin";
    if (!isSuperAdmin && profile?.brand_id !== po.brand_id) {
      return NextResponse.json(
        { error: "You do not have access to this purchase order" },
        { status: 403 }
      );
    }

    // Get approval history
    const { data: history, error: historyError } = await supabase
      .from("po_approval_history")
      .select(`
        *,
        actor:user_profiles!po_approval_history_actor_id_fkey (
          user_id,
          contact_name,
          company_name,
          email
        )
      `)
      .eq("po_id", params.id)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Error fetching PO history:", historyError);
      return NextResponse.json(
        { error: historyError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: history || [] });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
