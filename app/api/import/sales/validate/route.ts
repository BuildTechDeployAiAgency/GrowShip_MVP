import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ParsedSalesRow, ValidationError, ValidationResult } from "@/types/import";

/**
 * POST /api/import/sales/validate
 * Validate parsed sales data before import
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
    const {
      salesRows,
      distributorId,
      fileHash,
      brandId,
    }: {
      salesRows: ParsedSalesRow[];
      distributorId: string;
      fileHash: string;
      brandId: string;
    } = body;

    // Validate required parameters
    if (!salesRows || !Array.isArray(salesRows) || salesRows.length === 0) {
      return NextResponse.json(
        { error: "No sales data to validate" },
        { status: 400 }
      );
    }

    if (!distributorId) {
      return NextResponse.json(
        { error: "Distributor ID is required" },
        { status: 400 }
      );
    }

    if (!brandId || brandId !== profile.brand_id) {
      return NextResponse.json(
        { error: "Brand ID mismatch or not provided" },
        { status: 403 }
      );
    }

    console.log(`[Sales Validation] Validating ${salesRows.length} sales rows for brand ${brandId}, distributor ${distributorId}`);

    // Validate distributor access
    const isDistributorUser = profile.role_name?.startsWith("distributor_");
    if (isDistributorUser && profile.distributor_id !== distributorId) {
      return NextResponse.json(
        { error: "You can only import sales data for your assigned distributor" },
        { status: 403 }
      );
    }

    // Verify distributor exists and belongs to brand
    const { data: distributor, error: distError } = await supabase
      .from("distributors")
      .select("id, name, brand_id, status")
      .eq("id", distributorId)
      .eq("brand_id", brandId)
      .single();

    if (distError || !distributor) {
      return NextResponse.json(
        { error: "Distributor not found or does not belong to your brand" },
        { status: 404 }
      );
    }

    if (distributor.status !== "active") {
      return NextResponse.json(
        { error: `Distributor "${distributor.name}" is not active` },
        { status: 400 }
      );
    }

    // Get all unique SKUs from sales rows
    const skus = [...new Set(salesRows.map((row) => row.sku))];

    // Validate SKUs exist and are active
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("sku, name, status")
      .eq("brand_id", brandId)
      .in("sku", skus);

    if (productsError) {
      console.error("[Sales Validation] Error fetching products:", productsError);
      return NextResponse.json(
        { error: "Failed to validate product SKUs" },
        { status: 500 }
      );
    }

    // Create SKU lookup map
    const productMap = new Map(
      products?.map((p) => [p.sku, { name: p.name, status: p.status }]) || []
    );

    // Validation errors array
    const errors: ValidationError[] = [];
    const validRows: ParsedSalesRow[] = [];
    const invalidRows: ParsedSalesRow[] = [];

    // Validate each sales row
    for (const row of salesRows) {
      const rowErrors: ValidationError[] = [];

      // Validate sales_date
      if (!row.sales_date || !isValidDate(row.sales_date)) {
        rowErrors.push({
          row: row.row,
          field: "sales_date",
          message: "Invalid or missing sales date",
          code: "INVALID_DATE_FORMAT",
          value: row.sales_date,
        });
      }

      // Validate SKU
      if (!row.sku || !row.sku.trim()) {
        rowErrors.push({
          row: row.row,
          field: "sku",
          message: "SKU is required",
          code: "REQUIRED_FIELD",
        });
      } else {
        const product = productMap.get(row.sku);
        if (!product) {
          rowErrors.push({
            row: row.row,
            field: "sku",
            message: `SKU "${row.sku}" does not exist in your products catalog`,
            code: "SKU_NOT_FOUND",
            value: row.sku,
          });
        } else if (product.status !== "active") {
          rowErrors.push({
            row: row.row,
            field: "sku",
            message: `Product "${row.sku}" is not active (status: ${product.status})`,
            code: "PRODUCT_NOT_ACTIVE",
            value: row.sku,
          });
        }
      }

      // Validate retailer_name
      if (!row.retailer_name || !row.retailer_name.trim()) {
        rowErrors.push({
          row: row.row,
          field: "retailer_name",
          message: "Retailer name is required",
          code: "REQUIRED_FIELD",
        });
      }

      // Validate territory
      if (!row.territory || !row.territory.trim()) {
        rowErrors.push({
          row: row.row,
          field: "territory",
          message: "Territory/Region is required",
          code: "REQUIRED_FIELD",
        });
      }

      // Validate units_sold
      if (row.units_sold === undefined || row.units_sold === null) {
        rowErrors.push({
          row: row.row,
          field: "units_sold",
          message: "Units sold is required",
          code: "REQUIRED_FIELD",
        });
      } else if (row.units_sold < 0) {
        rowErrors.push({
          row: row.row,
          field: "units_sold",
          message: "Units sold must be non-negative",
          code: "INVALID_QUANTITY",
          value: row.units_sold,
        });
      }

      // Validate total_sales
      if (row.total_sales === undefined || row.total_sales === null) {
        rowErrors.push({
          row: row.row,
          field: "total_sales",
          message: "Net revenue is required",
          code: "REQUIRED_FIELD",
        });
      } else if (row.total_sales < 0) {
        rowErrors.push({
          row: row.row,
          field: "total_sales",
          message: "Net revenue must be non-negative",
          code: "INVALID_AMOUNT",
          value: row.total_sales,
        });
      }

      // Validate optional numeric fields
      if (row.gross_revenue_local !== undefined && row.gross_revenue_local < 0) {
        rowErrors.push({
          row: row.row,
          field: "gross_revenue_local",
          message: "Gross revenue must be non-negative",
          code: "INVALID_AMOUNT",
          value: row.gross_revenue_local,
        });
      }

      if (row.marketing_spend !== undefined && row.marketing_spend < 0) {
        rowErrors.push({
          row: row.row,
          field: "marketing_spend",
          message: "Marketing spend must be non-negative",
          code: "INVALID_AMOUNT",
          value: row.marketing_spend,
        });
      }

      // Validate sales_channel if provided
      const validChannels = ["retail", "ecom", "wholesale", "direct", "other"];
      if (row.sales_channel && !validChannels.includes(row.sales_channel.toLowerCase())) {
        rowErrors.push({
          row: row.row,
          field: "sales_channel",
          message: `Invalid sales channel. Must be one of: ${validChannels.join(", ")}`,
          code: "INVALID_SALES_CHANNEL",
          value: row.sales_channel,
        });
      }

      // Add row to valid or invalid list
      if (rowErrors.length === 0) {
        validRows.push(row);
      } else {
        invalidRows.push(row);
        errors.push(...rowErrors);
      }
    }

    console.log(`[Sales Validation] Valid rows: ${validRows.length}, Invalid rows: ${invalidRows.length}, Errors: ${errors.length}`);

    // Prepare validation result
    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      validSalesRows: validRows,
      invalidSalesRows: invalidRows,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[Sales Validation] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to validate sales data",
      },
      { status: 500 }
    );
  }
}

/**
 * Validate date string format
 */
function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

