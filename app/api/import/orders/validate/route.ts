import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOrders } from "@/lib/excel/validator";
import { checkDuplicateImport } from "@/utils/idempotency";
import { ParsedOrder } from "@/types/import";

/**
 * POST /api/import/orders/validate
 * Validate parsed orders against business rules and database
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with contact info for auto-population
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id, contact_name, company_name, email")
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
    const { orders, distributorId, fileHash, brandId } = body as {
      orders: ParsedOrder[];
      distributorId: string;
      fileHash: string;
      brandId: string;
    };

    console.log("[Import Validate] Starting validation", {
      ordersCount: orders?.length || 0,
      distributorId,
      brandId,
      userId: user.id,
    });

    if (!orders || !Array.isArray(orders)) {
      console.error("[Import Validate] Invalid orders data", { orders });
      return NextResponse.json(
        { success: false, error: "Invalid orders data" },
        { status: 400 }
      );
    }

    if (!distributorId) {
      console.error("[Import Validate] Missing distributor ID");
      return NextResponse.json(
        { success: false, error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    if (!brandId) {
      console.error("[Import Validate] Missing brand ID");
      return NextResponse.json(
        { success: false, error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Check for role-based permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandUser = profile.role_name?.startsWith("brand_");
    const isDistributorUser = profile.role_name?.startsWith("distributor_");

    // Validate brand access
    if (!isSuperAdmin && profile.brand_id !== brandId) {
      return NextResponse.json(
        { error: "You do not have access to this brand" },
        { status: 403 }
      );
    }

    // For distributor_admin users, validate they can only import for their own distributor
    if (isDistributorUser && profile.distributor_id) {
      if (distributorId !== profile.distributor_id) {
        return NextResponse.json(
          { error: "You can only import orders for your assigned distributor" },
          { status: 403 }
        );
      }
    }

    // Auto-populate distributor_id for distributor_admin if not provided
    const finalDistributorId = distributorId || (isDistributorUser ? profile.distributor_id : distributorId);
    
    if (!finalDistributorId) {
      return NextResponse.json(
        { success: false, error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    // Check for duplicate import
    if (fileHash) {
      const duplicateCheck = await checkDuplicateImport(
        fileHash,
        brandId,
        user.id,
        "orders"
      );

      if (duplicateCheck.isDuplicate && duplicateCheck.previousImport) {
        return NextResponse.json({
          success: false,
          error: "This file has already been imported",
          isDuplicate: true,
          previousImport: duplicateCheck.previousImport,
        });
      }
    }

    // Fetch distributor info for auto-population
    const { data: distributor, error: distributorError } = await supabase
      .from("distributors")
      .select("id, name, contact_name, contact_email, brand_id, status")
      .eq("id", finalDistributorId)
      .single();

    if (distributorError || !distributor) {
      return NextResponse.json(
        { success: false, error: "Distributor not found" },
        { status: 400 }
      );
    }

    // Apply auto-population to orders
    const autoPopulatedOrders = orders.map((order) => {
      const autoPopulated: ParsedOrder = {
        ...order,
        // Auto-populate distributor_id if empty
        distributor_id: order.distributor_id || finalDistributorId,
        // Auto-populate customer_name if empty
        customer_name: order.customer_name?.trim() || 
                      distributor.contact_name || 
                      distributor.name || 
                      profile.contact_name || 
                      profile.company_name || 
                      "",
        // Auto-populate customer_email if empty
        customer_email: order.customer_email?.trim() || 
                       distributor.contact_email || 
                       profile.email || 
                       undefined,
      };
      return autoPopulated;
    });

    // Validate orders
    console.log("[Import Validate] Calling validateOrders function");
    const validationResult = await validateOrders(autoPopulatedOrders, brandId, finalDistributorId);
    
    console.log("[Import Validate] Validation completed", {
      valid: validationResult.valid,
      validOrders: validationResult.validOrders.length,
      invalidOrders: validationResult.invalidOrders.length,
      errorsCount: validationResult.errors.length,
    });

    return NextResponse.json({
      success: validationResult.valid,
      data: validationResult,
    });
  } catch (error: any) {
    console.error("[Import Validate] Fatal error in validate orders API", {
      error: error,
      message: error.message,
      stack: error.stack,
      userId: user?.id,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

