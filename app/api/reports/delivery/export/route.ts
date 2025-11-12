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

    // Fetch delivery performance
    const { data: performanceData, error: performanceError } = await supabase.rpc(
      "get_delivery_performance",
      {
        p_brand_id: finalBrandId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      }
    );

    if (performanceError) {
      return NextResponse.json(
        { error: performanceError.message },
        { status: 500 }
      );
    }

    const performance = performanceData?.[0] || {};

    // Format data for Excel
    const reportData = {
      type: "delivery" as const,
      title: "Delivery Performance Report",
      period: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      data: [
        {
          total_deliveries: performance.total_deliveries || 0,
          on_time_deliveries: performance.on_time_deliveries || 0,
          late_deliveries: performance.late_deliveries || 0,
          on_time_percentage: performance.on_time_percentage || 0,
          avg_delivery_time: performance.avg_delivery_time || 0,
        },
      ],
      columns: [
        { header: "Total Deliveries", key: "total_deliveries", width: 18, format: "number" },
        { header: "On-Time Deliveries", key: "on_time_deliveries", width: 20, format: "number" },
        { header: "Late Deliveries", key: "late_deliveries", width: 15, format: "number" },
        { header: "On-Time Percentage", key: "on_time_percentage", width: 20, format: "percentage" },
        { header: "Avg Delivery Time (days)", key: "avg_delivery_time", width: 25, format: "number" },
      ],
    };

    const buffer = await generateExcelReport(reportData);
    const filename = getReportFilename("delivery");

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
    console.error("Error exporting delivery report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

