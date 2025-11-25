import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, distributor_id, role_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const product_id = searchParams.get("product_id");
    const sku = searchParams.get("sku");
    const transaction_type = searchParams.get("transaction_type");
    const source_type = searchParams.get("source_type");
    const source_id = searchParams.get("source_id");
    const date_from = searchParams.get("date_from");
    const date_to = searchParams.get("date_to");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100

    // Build query
    let query = supabase
      .from("inventory_transactions")
      .select("*", { count: "exact" });

    // Apply RLS-based filters (brand or distributor)
    if (profile.role_name === "distributor" && profile.distributor_id) {
      // Distributors only see transactions for their orders/POs
      query = query.or(
        `and(source_type.eq.order,source_id.in.(select id from orders where distributor_id.eq.${profile.distributor_id})),and(source_type.eq.purchase_order,source_id.in.(select id from purchase_orders where distributor_id.eq.${profile.distributor_id}))`
      );
    } else if (profile.brand_id) {
      // Brand users see all their brand's transactions
      query = query.eq("brand_id", profile.brand_id);
    }
    // Super admins see all (no filter)

    // Apply optional filters
    if (product_id) {
      query = query.eq("product_id", product_id);
    }

    if (sku) {
      query = query.ilike("sku", `%${sku}%`);
    }

    if (transaction_type) {
      query = query.eq("transaction_type", transaction_type);
    }

    if (source_type) {
      query = query.eq("source_type", source_type);
    }

    if (source_id) {
      query = query.eq("source_id", source_id);
    }

    if (date_from) {
      query = query.gte("transaction_date", date_from);
    }

    if (date_to) {
      query = query.lte("transaction_date", date_to);
    }

    if (status) {
      query = query.eq("status", status);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute query
    const { data: transactions, error: queryError, count } = await query;

    if (queryError) {
      console.error("Error fetching transactions:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Unexpected error in transactions endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

