import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateOrders } from "@/lib/excel/validator";
import { checkDuplicateImport } from "@/utils/idempotency";
import { ParsedOrder } from "@/types/import";

/**
 * POST /api/import/orders/validate
 * Validate parsed orders against business rules and database
 */
export async function POST(request: NextRequest) {
  let currentUserId: string | null = null;
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
    currentUserId = user.id;

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

    // For distributor_admin users, always use profile.brand_id instead of request brandId
    // This ensures they can only import to their own brand
    const finalBrandId = isDistributorUser ? profile.brand_id : brandId;
    
    // Validate brand access
    if (!isSuperAdmin && profile.brand_id !== finalBrandId) {
      return NextResponse.json(
        { error: "You do not have access to this brand" },
        { status: 403 }
      );
    }
    
    if (!finalBrandId) {
      return NextResponse.json(
        { success: false, error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // For distributor_admin users, ALWAYS use their distributor_id from profile
    // This ensures they can only import to their own distributor
    let finalDistributorId = distributorId;
    
    if (isDistributorUser) {
      if (!profile.distributor_id) {
        console.error("[Import Validate] Distributor admin user missing distributor_id", {
          userId: user.id,
          roleName: profile.role_name,
        });
        return NextResponse.json(
          { 
            success: false, 
            error: "Your account is not associated with a distributor. Please contact support." 
          },
          { status: 403 }
        );
      }
      
      // Force distributor_admin to use their own distributor_id
      finalDistributorId = profile.distributor_id;
      
      // Validate that the provided distributorId matches their profile (if provided)
      if (distributorId && distributorId !== profile.distributor_id) {
        console.warn("[Import Validate] Distributor admin tried to use different distributor_id", {
          provided: distributorId,
          profile: profile.distributor_id,
          userId: user.id,
        });
        return NextResponse.json(
          { 
            success: false,
            error: "You can only import orders for your assigned distributor" 
          },
          { status: 403 }
        );
      }
    }
    
    if (!finalDistributorId) {
      return NextResponse.json(
        { success: false, error: "Distributor ID is required" },
        { status: 400 }
      );
    }
    
    console.log("[Import Validate] Using distributor ID", {
      finalDistributorId,
      providedDistributorId: distributorId,
      isDistributorUser,
      profileDistributorId: profile.distributor_id,
    });

    // Check for duplicate import
    // Use finalBrandId which is profile.brand_id for distributor_admin users
    if (fileHash) {
      const duplicateCheck = await checkDuplicateImport(
        fileHash,
        finalBrandId,
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
    // Use admin client for distributor_admin users to avoid RLS recursion issues
    // We've already validated permissions above, so this is safe
    const clientToUse = isDistributorUser ? createAdminClient() : supabase;
    
    const { data: distributor, error: distributorError } = await clientToUse
      .from("distributors")
      .select("id, name, contact_name, contact_email, brand_id, status")
      .eq("id", finalDistributorId)
      .single();

    if (distributorError || !distributor) {
      console.error("[Import Validate] Failed to fetch distributor", {
        distributorId: finalDistributorId,
        error: distributorError,
        isDistributorUser,
        userId: user.id,
        profileDistributorId: profile.distributor_id,
      });
      
      // Provide more specific error message
      let errorMessage = "Distributor not found";
      if (distributorError?.code === "PGRST116") {
        errorMessage = `Distributor with ID ${finalDistributorId} does not exist or you don't have access to it.`;
      } else if (distributorError?.message) {
        errorMessage = `Failed to fetch distributor: ${distributorError.message}`;
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
    
    // Additional validation: Ensure distributor belongs to user's brand
    // Use finalBrandId which is profile.brand_id for distributor_admin users
    // For distributor_admin users: if they're using their own distributor_id from profile,
    // we allow the import even if there's a brand_id mismatch (data inconsistency)
    // This prevents blocking legitimate imports due to data issues
    if (!isSuperAdmin && distributor.brand_id !== finalBrandId) {
      console.warn("[Import Validate] Distributor brand mismatch detected", {
        distributorId: finalDistributorId,
        distributorBrandId: distributor.brand_id,
        finalBrandId,
        requestBrandId: brandId,
        profileBrandId: profile.brand_id,
        isDistributorUser,
        userId: user.id,
        distributorName: distributor.name,
      });
      
      // For distributor_admin users using their own distributor_id, allow import
      // but log the data inconsistency for admin review
      if (isDistributorUser && distributor.id === profile.distributor_id) {
        console.warn("[Import Validate] Allowing import despite brand mismatch - distributor_admin using own distributor", {
          userId: user.id,
          distributorId: distributor.id,
          distributorBrandId: distributor.brand_id,
          profileBrandId: profile.brand_id,
        });
        // Continue with import - the distributor_id match is sufficient validation
      } else {
        // For other users or mismatched distributor_id, reject
        return NextResponse.json(
          { success: false, error: "Distributor does not belong to your brand" },
          { status: 403 }
        );
      }
    }
    
    // For distributor_admin users, also ensure the distributor_id matches their profile
    if (isDistributorUser && distributor.id !== profile.distributor_id) {
      console.error("[Import Validate] Distributor ID mismatch for distributor_admin", {
        distributorId: distributor.id,
        profileDistributorId: profile.distributor_id,
        userId: user.id,
      });
      return NextResponse.json(
        { success: false, error: "Distributor ID does not match your account" },
        { status: 403 }
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
    // Use finalBrandId which is profile.brand_id for distributor_admin users
    console.log("[Import Validate] Calling validateOrders function", {
      ordersCount: autoPopulatedOrders.length,
      finalBrandId,
      finalDistributorId,
      isDistributorUser,
    });
    const validationResult = await validateOrders(autoPopulatedOrders, finalBrandId, finalDistributorId);
    
    console.log("[Import Validate] Validation completed", {
      valid: validationResult.valid,
      validOrders: validationResult.validOrders?.length || 0,
      invalidOrders: validationResult.invalidOrders?.length || 0,
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
      userId: currentUserId,
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

