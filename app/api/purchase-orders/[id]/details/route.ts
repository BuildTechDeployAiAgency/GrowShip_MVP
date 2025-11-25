import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const poId = params.id;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get PO header
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", poId)
      .single();

    if (poError || !po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Get PO lines
    const { data: lines, error: linesError } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", poId)
      .order("created_at", { ascending: true });

    if (linesError) {
      console.error("Error fetching PO lines:", linesError);
    }

    // Get approval history
    const { data: history, error: historyError } = await supabase
      .from("po_approval_history")
      .select(`
        *,
        actor:auth.users!po_approval_history_actor_id_fkey(
          id,
          email
        )
      `)
      .eq("po_id", poId)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("Error fetching approval history:", historyError);
    }

    // Get related orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, order_date, order_status, total_amount, currency")
      .eq("purchase_order_id", poId)
      .order("order_date", { ascending: false });

    if (ordersError) {
      console.error("Error fetching related orders:", ordersError);
    }

    // Get backorder records
    const { data: backorders, error: backordersError } = await supabase
      .from("po_backorders")
      .select("*")
      .eq("po_id", poId)
      .order("created_at", { ascending: false });

    if (backordersError) {
      console.error("Error fetching backorders:", backordersError);
    }

    // Get distributor info if applicable
    let distributor = null;
    if (po.distributor_id) {
      const { data: distData } = await supabase
        .from("distributors")
        .select("*")
        .eq("id", po.distributor_id)
        .single();
      distributor = distData;
    }

    return NextResponse.json({
      po,
      lines: lines || [],
      history: history || [],
      orders: orders || [],
      backorders: backorders || [],
      distributor,
    });
  } catch (error) {
    console.error("Error fetching PO details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

