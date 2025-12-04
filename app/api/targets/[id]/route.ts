import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { data, error } = await supabase
      .from("sales_targets")
      .select(`
        *,
        distributors:distributor_id (name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching target:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Target not found" },
        { status: 404 }
      );
    }

    // Transform data to include distributor_name
    const target = {
      ...data,
      distributor_name: (data as any).distributors?.name || null,
      distributors: undefined,
    };

    return NextResponse.json({ target });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const { 
      target_quantity, 
      target_revenue, 
      target_period, 
      period_type,
      // New fields
      sku,
      target_scope,
      target_name,
      distributor_id,
      country,
      territory,
      campaign_id,
      currency,
      notes,
    } = body;

    const updateData: any = {};
    if (target_quantity !== undefined) updateData.target_quantity = target_quantity;
    if (target_revenue !== undefined) updateData.target_revenue = target_revenue;
    if (target_period !== undefined) updateData.target_period = target_period;
    if (period_type !== undefined) updateData.period_type = period_type;
    // New fields
    if (sku !== undefined) updateData.sku = sku;
    if (target_scope !== undefined) updateData.target_scope = target_scope;
    if (target_name !== undefined) updateData.target_name = target_name;
    if (distributor_id !== undefined) updateData.distributor_id = distributor_id;
    if (country !== undefined) updateData.country = country;
    if (territory !== undefined) updateData.territory = territory;
    if (campaign_id !== undefined) updateData.campaign_id = campaign_id;
    if (currency !== undefined) updateData.currency = currency;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from("sales_targets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating target:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Refresh materialized view
    try {
      await supabase.rpc("refresh_target_vs_actual_view");
    } catch (refreshError) {
      console.warn("Could not refresh target_vs_actual_view:", refreshError);
    }

    return NextResponse.json({ target: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { error } = await supabase
      .from("sales_targets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting target:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Refresh materialized view
    await supabase.rpc("refresh_target_vs_actual_view");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


