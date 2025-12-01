import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  
  // Get pagination params from URL
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
  const offset = (page - 1) * pageSize;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get order to verify access and get created_at/created_by for "Order Created" entry
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("brand_id, created_at, created_by")
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

    // Get total count of history entries
    const { count: totalHistoryCount, error: countError } = await supabase
      .from("order_history")
      .select("id", { count: "exact", head: true })
      .eq("order_id", id);

    if (countError) {
      console.error("Error counting order history:", countError);
    }

    // Total count includes +1 for the "Order Created" synthetic entry
    const totalCount = (totalHistoryCount || 0) + 1;

    // Get order history with pagination
    // Use the correct FK constraint name from migration 030
    const { data: history, error: historyError } = await supabase
      .from("order_history")
      .select(`
        *,
        changed_by_user:user_profiles!order_history_changed_by_user_profile_fkey (
          user_id,
          contact_name,
          company_name,
          email
        )
      `)
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (historyError) {
      console.error("Error fetching order history:", historyError);
      // Fallback: try without the FK join if it fails
      const { data: historyFallback, error: fallbackError } = await supabase
        .from("order_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (fallbackError) {
        return NextResponse.json(
          { error: fallbackError.message },
          { status: 500 }
        );
      }

      // Manually fetch user profiles for the fallback
      const changedByIds = [...new Set(historyFallback?.map(h => h.changed_by).filter(Boolean) || [])];
      let userProfiles: Record<string, any> = {};

      if (changedByIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, contact_name, company_name, email")
          .in("user_id", changedByIds);

        if (profiles) {
          userProfiles = profiles.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Map the history with user profiles
      const historyWithUsers = (historyFallback || []).map(entry => ({
        ...entry,
        changed_by_user: userProfiles[entry.changed_by] || null,
      }));

      // Get created_by user profile for "Order Created" entry
      let createdByUser = null;
      if (order.created_by) {
        const { data: creatorProfile } = await supabase
          .from("user_profiles")
          .select("user_id, contact_name, company_name, email")
          .eq("user_id", order.created_by)
          .single();
        createdByUser = creatorProfile;
      }

      return NextResponse.json({
        history: historyWithUsers,
        totalCount,
        page,
        pageSize,
        hasMore: offset + historyWithUsers.length < totalCount,
        orderCreatedAt: order.created_at,
        orderCreatedBy: order.created_by,
        orderCreatedByUser: createdByUser,
      });
    }

    // Get created_by user profile for "Order Created" entry
    let createdByUser = null;
    if (order.created_by) {
      const { data: creatorProfile } = await supabase
        .from("user_profiles")
        .select("user_id, contact_name, company_name, email")
        .eq("user_id", order.created_by)
        .single();
      createdByUser = creatorProfile;
    }

    return NextResponse.json({
      history: history || [],
      totalCount,
      page,
      pageSize,
      hasMore: offset + (history?.length || 0) < totalCount,
      orderCreatedAt: order.created_at,
      orderCreatedBy: order.created_by,
      orderCreatedByUser: createdByUser,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
