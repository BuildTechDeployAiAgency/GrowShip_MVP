import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateExcelReport, getReportFilename } from "@/lib/reports/report-generator";

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

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get("brand_id");
    const sku = searchParams.get("sku");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const finalBrandId = profile.role_name === "super_admin"
      ? (brandId || profile.brand_id)
      : profile.brand_id;

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Fetch SKU performance data
    const adminSupabase = createAdminClient();
    const { data: reportData, error: reportError } = await adminSupabase.rpc(
      "get_sku_performance_report",
      {
        p_brand_id: finalBrandId,
        p_sku: sku || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }
    );

    if (reportError) {
      return NextResponse.json(
        { error: reportError.message },
        { status: 500 }
      );
    }

    // Format data for Excel
    const reportDataFormatted = {
      type: "sku_performance" as const,
      title: "SKU Performance Report",
      period: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      data: reportData || [],
      columns: [
        { header: "SKU", key: "sku", width: 15 },
        { header: "Product Name", key: "product_name", width: 25 },
        { header: "Total Quantity Sold", key: "total_quantity", width: 20, format: "number" },
        { header: "Total Revenue", key: "total_revenue", width: 18, format: "currency" },
        { header: "Avg Unit Price", key: "avg_unit_price", width: 18, format: "currency" },
        { header: "Number of Orders", key: "order_count", width: 18, format: "number" },
        { header: "First Order Date", key: "first_order_date", width: 18, format: "date" },
        { header: "Last Order Date", key: "last_order_date", width: 18, format: "date" },
      ],
    };

    const buffer = await generateExcelReport(reportDataFormatted);
    const filename = getReportFilename("sku_performance");

    const fileArray: Uint8Array =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    const underlyingBuffer = fileArray.buffer as ArrayBuffer;
    const payload =
      fileArray.byteOffset === 0 && fileArray.byteLength === underlyingBuffer.byteLength
        ? underlyingBuffer
        : underlyingBuffer.slice(
            fileArray.byteOffset,
            fileArray.byteOffset + fileArray.byteLength
          );

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error exporting SKU performance report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

