import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get order to verify access
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("brand_id")
      .eq("id", id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
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
    if (!isSuperAdmin && profile?.brand_id !== order.brand_id) {
      return NextResponse.json(
        { error: "You do not have access to this order" },
        { status: 403 }
      );
    }

    // Get order history
    const { data: history, error: historyError } = await supabase
      .from("order_history")
      .select(`
        *,
        changed_by_user:user_profiles!order_history_changed_by_fkey (
          user_id,
          contact_name,
          company_name,
          email
        )
      `)
      .eq("order_id", id)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("Error fetching order history:", historyError);
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

