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

    const productId = params.id;

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("brand_id, role_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify product exists and user has access
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check access
    if (profile.role_name !== "super_admin" && profile.brand_id !== product.brand_id) {
      return NextResponse.json(
        { error: "You do not have access to this product" },
        { status: 403 }
      );
    }

    // Get transaction history
    const { data: transactions, error: transError } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("product_id", productId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (transError) {
      console.error("Error fetching transaction history:", transError);
      return NextResponse.json(
        { error: "Failed to fetch transaction history" },
        { status: 500 }
      );
    }

    // Calculate stock levels over time (sample daily)
    const stockLevelsOverTime: Array<{
      date: string;
      quantity: number;
      allocated: number;
      available: number;
      inbound: number;
    }> = [];

    if (transactions && transactions.length > 0) {
      const dailyStocks = new Map<string, any>();

      for (const transaction of transactions) {
        const date = new Date(transaction.transaction_date).toISOString().split("T")[0];
        
        // Keep only the most recent transaction per day
        if (!dailyStocks.has(date)) {
          dailyStocks.set(date, {
            date,
            quantity: transaction.quantity_after,
            allocated: transaction.allocated_after,
            available: transaction.quantity_after - transaction.allocated_after,
            inbound: transaction.inbound_after,
          });
        }
      }

      // Convert to array and sort by date
      stockLevelsOverTime.push(...Array.from(dailyStocks.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
    }

    // Calculate summary statistics
    const summary = {
      total_inbound: 0,
      total_outbound: 0,
      total_adjustments: 0,
      net_change: 0,
    };

    if (transactions) {
      for (const transaction of transactions) {
        const change = transaction.quantity_change || 0;
        
        if (transaction.transaction_type.includes("PO_")) {
          summary.total_inbound += Math.abs(change);
        } else if (transaction.transaction_type.includes("ORDER_")) {
          summary.total_outbound += Math.abs(change);
        } else if (transaction.transaction_type.includes("ADJUSTMENT")) {
          summary.total_adjustments += Math.abs(change);
        }

        summary.net_change += change;
      }
    }

    return NextResponse.json({
      product: {
        id: product.id,
        sku: product.sku,
        product_name: product.product_name,
        current_stock: product.quantity_in_stock,
        allocated_stock: product.allocated_stock,
        available_stock: product.available_stock,
        inbound_stock: product.inbound_stock,
      },
      transactions: transactions || [],
      stock_levels_over_time: stockLevelsOverTime,
      summary,
    });
  } catch (error) {
    console.error("Unexpected error in product history endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

