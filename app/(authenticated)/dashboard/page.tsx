import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import type { DashboardMetrics } from "@/types/dashboard";

function toNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchDashboardMetricsServer(
  userId: string,
  brandId: string | null,
  userRole: string | null
): Promise<DashboardMetrics | null> {
  try {
    const supabase = await createClient();
    
    // Determine table suffix based on role
    const tableSuffix = userRole?.startsWith("brand_admin") && brandId
      ? `sales_documents_view_${brandId.replace(/-/g, "_")}`
      : `sales_documents_${userId.replace(/-/g, "_")}`;

    const rpcParams = {
      p_table_suffix: tableSuffix,
      p_user_id: userId,
      p_year: new Date().getFullYear(),
      p_month: new Date().getMonth() + 1,
      p_user_role: userRole || "",
      p_brand_id: brandId || null,
    };

    const { data, error } = await supabase.rpc(
      "get_sales_dashboard_metrics",
      rpcParams
    );

    if (error) {
      // Check if RPC function doesn't exist
      const isFunctionNotFound =
        error.code === "P0004" ||
        error.message?.includes("Could not find the function") ||
        error.message?.includes("does not exist") ||
        error.code === "42883";

      if (isFunctionNotFound) {
        console.warn("[SSR] RPC function 'get_sales_dashboard_metrics' not found.");
        return null;
      }

      console.error("[SSR] Error fetching dashboard metrics:", error.message);
      return null;
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      total_revenue: toNumber(row.total_revenue, 0),
      total_revenue_display: row.total_revenue_display || "$0",
      revenue_growth_percentage: toNumber(row.revenue_growth_percentage, 0),
      revenue_growth_display: row.revenue_growth_display || "+0%",

      profit_margin: toNumber(row.profit_margin, 0),
      profit_margin_display: row.profit_margin_display || "0%",
      profit_margin_growth_percentage: toNumber(
        row.profit_margin_growth_percentage,
        0
      ),
      profit_margin_growth_display: row.profit_margin_growth_display || "+0%",

      target_achievement: toNumber(row.target_achievement, 0),
      target_achievement_display: row.target_achievement_display || "0%",
      target_period: row.target_period || "Current Period",

      pending_orders_count: toNumber(row.pending_orders_count, 0),
      pending_orders_count_display: row.pending_orders_count_display || "0",
      pending_orders_value: toNumber(row.pending_orders_value, 0),
      pending_orders_value_display: row.pending_orders_value_display || "$0",
    };
  } catch (error) {
    console.error("[SSR] Unexpected error fetching dashboard metrics:", error);
    return null;
  }
}

export default async function DashboardPage() {
  let initialMetrics: DashboardMetrics | null = null;

  try {
    const supabase = await createClient();
    
    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get user profile for role and brand info
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role_name, brand_id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        // Fetch dashboard metrics on the server
        initialMetrics = await fetchDashboardMetricsServer(
          user.id,
          profile.brand_id,
          profile.role_name
        );
      }
    }
  } catch (error) {
    // Log error but don't block rendering - client will fetch data
    console.error("[SSR] Error in dashboard page:", error);
  }

  return <DashboardClient initialMetrics={initialMetrics} />;
}
