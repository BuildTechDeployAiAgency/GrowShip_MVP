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
      .select("*")
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

    return NextResponse.json({ target: data });
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
    const { target_quantity, target_revenue, target_period, period_type } = body;

    const updateData: any = {};
    if (target_quantity !== undefined) updateData.target_quantity = target_quantity;
    if (target_revenue !== undefined) updateData.target_revenue = target_revenue;
    if (target_period !== undefined) updateData.target_period = target_period;
    if (period_type !== undefined) updateData.period_type = period_type;

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
    await supabase.rpc("refresh_target_vs_actual_view");

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


