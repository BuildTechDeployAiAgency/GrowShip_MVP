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

    // Get PO to verify access
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("brand_id, distributor_id")
      .eq("id", id)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Get user profile to check brand/distributor access
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    const isSuperAdmin = profile?.role_name === "super_admin";
    const isBrandMatch = profile?.brand_id === po.brand_id;
    const isDistributorMatch = profile?.distributor_id && profile.distributor_id === po.distributor_id;
    
    // Allow access if super admin, brand matches, or distributor matches (for distributor users)
    if (!isSuperAdmin && !isBrandMatch && !isDistributorMatch) {
      console.error(`[PO History Access Denied] PO: ${id}, User: ${user.id}, Role: ${profile?.role_name}, Brand: ${profile?.brand_id}, Dist: ${profile?.distributor_id}, PO Brand: ${po.brand_id}, PO Dist: ${po.distributor_id}`);
      return NextResponse.json(
        { error: "You do not have access to this purchase order" },
        { status: 403 }
      );
    }

    // Get approval history
    const { data: history, error: historyError } = await supabase
      .from("po_approval_history")
      .select("*")
      .eq("po_id", id)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Error fetching PO history:", historyError);
      return NextResponse.json(
        { error: historyError.message },
        { status: 500 }
      );
    }

    // Manually fetch actor profiles to avoid FK issues
    const actorIds = Array.from(new Set(history.map((h: any) => h.actor_id)));
    
    let historyWithActors = history;
    
    if (actorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, contact_name, company_name, email")
        .in("user_id", actorIds);
        
      if (!profilesError && profiles) {
        const profileMap = new Map(profiles.map(p => [p.user_id, p]));
        
        historyWithActors = history.map((h: any) => ({
          ...h,
          actor: profileMap.get(h.actor_id) || null
        }));
      }
    }

    return NextResponse.json({ history: historyWithActors || [] });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
