import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport, batchGenerateReports } from "@/lib/reports/monthly-generator";

/**
 * POST /api/reports/monthly/generate
 * Generate monthly distributor report(s)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { brandId, distributorId, month, purchaseOrderId, batch } = body;

    // Validate required fields
    if (!month) {
      return NextResponse.json(
        { error: "Month is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Validate month format
    const monthDate = new Date(month);
    if (isNaN(monthDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Determine brand and distributor based on user role
    const isSuperAdmin = profile.role_name === "super_admin";
    let finalBrandId = brandId;
    let finalDistributorId = distributorId;

    if (!isSuperAdmin) {
      // Override with user's brand/distributor
      finalBrandId = profile.brand_id;
      
      if (profile.distributor_id) {
        // Distributor admin: can only generate for their distributor
        finalDistributorId = profile.distributor_id;
      }
    }

    if (!finalBrandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Check if batch generation is requested
    if (batch) {
      // Generate for all distributors in the brand
      const result = await batchGenerateReports(finalBrandId, month);
      
      return NextResponse.json({
        success: result.success,
        reports: result.reports,
        errors: result.errors,
        message: `Generated ${result.reports.length} reports${
          result.errors.length > 0 ? ` with ${result.errors.length} errors` : ""
        }`,
      });
    } else {
      // Generate for single distributor
      if (!finalDistributorId) {
        return NextResponse.json(
          { error: "Distributor ID is required for single report generation" },
          { status: 400 }
        );
      }

      const result = await generateMonthlyReport({
        brandId: finalBrandId,
        distributorId: finalDistributorId,
        month,
        purchaseOrderId,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to generate report" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        report: result.report,
        message: "Report generated successfully",
      });
    }
  } catch (error: any) {
    console.error("Error in POST /api/reports/monthly/generate:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

