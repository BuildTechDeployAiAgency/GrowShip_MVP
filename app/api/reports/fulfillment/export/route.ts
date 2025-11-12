import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    // Fetch fulfillment metrics
    const { data: metricsData, error: metricsError } = await supabase.rpc(
      "get_order_fulfillment_metrics",
      {
        p_brand_id: finalBrandId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }
    );

    if (metricsError) {
      return NextResponse.json(
        { error: metricsError.message },
        { status: 500 }
      );
    }

    const metrics = metricsData?.[0] || {};

    // Format data for Excel
    const reportData = {
      type: "fulfillment" as const,
      title: "Order Fulfillment Report",
      period: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      data: [
        {
          total_orders: metrics.total_orders || 0,
          fulfilled_orders: metrics.fulfilled_orders || 0,
          pending_orders: metrics.pending_orders || 0,
          fulfillment_rate: metrics.fulfillment_rate || 0,
          avg_fulfillment_time: metrics.avg_fulfillment_time || 0,
        },
      ],
      columns: [
        { header: "Total Orders", key: "total_orders", width: 15, format: "number" },
        { header: "Fulfilled Orders", key: "fulfilled_orders", width: 18, format: "number" },
        { header: "Pending Orders", key: "pending_orders", width: 15, format: "number" },
        { header: "Fulfillment Rate", key: "fulfillment_rate", width: 18, format: "percentage" },
        { header: "Avg Fulfillment Time (days)", key: "avg_fulfillment_time", width: 25, format: "number" },
      ],
    };

    const buffer = await generateExcelReport(reportData);
    const filename = getReportFilename("fulfillment");

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
    console.error("Error exporting fulfillment report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

