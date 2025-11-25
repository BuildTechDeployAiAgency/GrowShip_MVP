import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateProducts } from "@/lib/excel/product-validator";
import { ParsedProduct } from "@/types/import";

/**
 * POST /api/import/products/validate
 * Validate parsed products against business rules and database
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

    // Check if user is super admin
    if (profile.role_name !== "super_admin") {
      return NextResponse.json(
        { error: "Only Super Admins can import products" },
        { status: 403 }
      );
    }

    if (!profile.brand_id) {
      return NextResponse.json(
        { error: "Brand ID not found in profile" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Invalid request: products array is required" },
        { status: 400 }
      );
    }

    // Validate products
    const validationResult = await validateProducts(
      products as ParsedProduct[],
      profile.brand_id
    );

    return NextResponse.json({
      success: true,
      data: validationResult,
    });
  } catch (error: any) {
    console.error("Error validating products:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

