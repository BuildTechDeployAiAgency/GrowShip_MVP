import { createAdminClient } from "@/lib/supabase/server";

export interface MonthlyReportMetrics {
  total_orders: number;
  total_units: number;
  total_sales: number;
  fill_rate?: number;
  avg_order_value: number;
}

export interface GenerateReportParams {
  brandId: string;
  distributorId: string;
  month: string; // '2025-11-01' format
  purchaseOrderId?: string;
}

/**
 * Calculate fill rate for a PO
 * Compares orders quantity against PO quantities
 */
export async function calculateFillRate(
  orders: any[],
  purchaseOrderId: string
): Promise<number | null> {
  if (!purchaseOrderId || orders.length === 0) {
    return null;
  }

  const supabase = createAdminClient();

  // Get PO line items
  const { data: poLines, error } = await supabase
    .from("purchase_order_lines")
    .select("sku, quantity")
    .eq("purchase_order_id", purchaseOrderId);

  if (error || !poLines || poLines.length === 0) {
    console.error("Error fetching PO lines:", error);
    return null;
  }

  // Calculate total PO quantity
  const poTotalQuantity = poLines.reduce(
    (sum, line) => sum + Number(line.quantity),
    0
  );

  if (poTotalQuantity === 0) {
    return 0;
  }

  // Calculate total ordered quantity
  const orderedQuantity = orders.reduce((sum, order) => {
    if (order.items && Array.isArray(order.items)) {
      return (
        sum +
        order.items.reduce((itemSum: number, item: any) => {
          return itemSum + (Number(item.quantity) || 0);
        }, 0)
      );
    }
    return sum;
  }, 0);

  // Calculate fill rate percentage
  const fillRate = (orderedQuantity / poTotalQuantity) * 100;
  return Math.min(fillRate, 100); // Cap at 100%
}

/**
 * Compute metrics from orders
 */
export async function computeMetrics(
  orders: any[],
  purchaseOrderId?: string
): Promise<MonthlyReportMetrics> {
  const totalOrders = orders.length;

  const totalUnits = orders.reduce((sum, order) => {
    if (order.items && Array.isArray(order.items)) {
      return (
        sum +
        order.items.reduce((itemSum: number, item: any) => {
          return itemSum + (Number(item.quantity) || 0);
        }, 0)
      );
    }
    return sum;
  }, 0);

  const totalSales = orders.reduce((sum, order) => {
    return sum + (Number(order.total_amount) || 0);
  }, 0);

  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  let fillRate: number | null = null;
  if (purchaseOrderId) {
    fillRate = await calculateFillRate(orders, purchaseOrderId);
  }

  return {
    total_orders: totalOrders,
    total_units: totalUnits,
    total_sales: totalSales,
    fill_rate: fillRate !== null ? fillRate : undefined,
    avg_order_value: avgOrderValue,
  };
}

/**
 * Generate monthly distributor report
 */
export async function generateMonthlyReport(
  params: GenerateReportParams
): Promise<{ success: boolean; report?: any; error?: string }> {
  const { brandId, distributorId, month, purchaseOrderId } = params;

  try {
    const supabase = createAdminClient();

    // Validate month format (should be first day of month)
    const monthDate = new Date(month);
    if (isNaN(monthDate.getTime())) {
      return { success: false, error: "Invalid month format" };
    }

    // Calculate date range for the month
    const startDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    const endDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Build query for orders
    let query = supabase
      .from("orders")
      .select("*")
      .eq("brand_id", brandId)
      .eq("distributor_id", distributorId)
      .gte("order_date", startDate.toISOString())
      .lte("order_date", endDate.toISOString());

    if (purchaseOrderId) {
      query = query.eq("purchase_order_id", purchaseOrderId);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return { success: false, error: ordersError.message };
    }

    // Compute metrics
    const metrics = await computeMetrics(orders || [], purchaseOrderId);

    // Prepare report data
    const reportData = {
      brand_id: brandId,
      distributor_id: distributorId,
      purchase_order_id: purchaseOrderId || null,
      report_month: `${monthDate.getFullYear()}-${String(
        monthDate.getMonth() + 1
      ).padStart(2, "0")}-01`,
      total_orders: metrics.total_orders,
      total_units: metrics.total_units,
      total_sales: metrics.total_sales,
      fill_rate: metrics.fill_rate,
      avg_order_value: metrics.avg_order_value,
      status: "draft",
      generated_at: new Date().toISOString(),
    };

    // Upsert report (update if exists, insert if not)
    const { data: report, error: reportError } = await supabase
      .from("monthly_distributor_reports")
      .upsert(reportData, {
        onConflict: "brand_id,distributor_id,report_month,purchase_order_id",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Error upserting report:", reportError);
      return { success: false, error: reportError.message };
    }

    return { success: true, report };
  } catch (error: any) {
    console.error("Error generating monthly report:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Get existing report or generate if not exists
 */
export async function getOrGenerateReport(
  params: GenerateReportParams
): Promise<{ success: boolean; report?: any; error?: string }> {
  const { brandId, distributorId, month, purchaseOrderId } = params;

  try {
    const supabase = createAdminClient();

    // Normalize month to first day
    const monthDate = new Date(month);
    const normalizedMonth = `${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1
    ).padStart(2, "0")}-01`;

    // Try to fetch existing report
    let query = supabase
      .from("monthly_distributor_reports")
      .select("*")
      .eq("brand_id", brandId)
      .eq("distributor_id", distributorId)
      .eq("report_month", normalizedMonth);

    if (purchaseOrderId) {
      query = query.eq("purchase_order_id", purchaseOrderId);
    } else {
      query = query.is("purchase_order_id", null);
    }

    const { data: existingReport, error: fetchError } = await query.single();

    // If report exists and was generated recently (within 24 hours), return it
    if (existingReport && !fetchError) {
      const generatedAt = new Date(existingReport.generated_at || existingReport.created_at);
      const hoursSinceGeneration =
        (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceGeneration < 24) {
        return { success: true, report: existingReport };
      }
    }

    // Generate new report
    return await generateMonthlyReport(params);
  } catch (error: any) {
    console.error("Error in getOrGenerateReport:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Batch generate reports for all distributors in a brand for a given month
 */
export async function batchGenerateReports(
  brandId: string,
  month: string
): Promise<{ success: boolean; reports: any[]; errors: any[] }> {
  const supabase = createAdminClient();

  // Get all distributors for the brand
  const { data: distributors, error: distError } = await supabase
    .from("distributors")
    .select("id")
    .eq("brand_id", brandId)
    .eq("status", "active");

  if (distError || !distributors) {
    return {
      success: false,
      reports: [],
      errors: [{ error: "Failed to fetch distributors" }],
    };
  }

  const reports: any[] = [];
  const errors: any[] = [];

  // Generate report for each distributor
  for (const distributor of distributors) {
    const result = await generateMonthlyReport({
      brandId,
      distributorId: distributor.id,
      month,
    });

    if (result.success && result.report) {
      reports.push(result.report);
    } else {
      errors.push({
        distributorId: distributor.id,
        error: result.error,
      });
    }
  }

  return {
    success: errors.length === 0,
    reports,
    errors,
  };
}

