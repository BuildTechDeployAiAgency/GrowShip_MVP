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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id")
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

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: "Invalid orders data" },
        { status: 400 }
      );
    }

    if (!distributorId) {
      return NextResponse.json(
        { error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
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

    // Validate orders
    const validationResult = await validateOrders(orders, brandId, distributorId);

    return NextResponse.json({
      success: validationResult.valid,
      data: validationResult,
    });
  } catch (error: any) {
    console.error("Error in validate orders API:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

