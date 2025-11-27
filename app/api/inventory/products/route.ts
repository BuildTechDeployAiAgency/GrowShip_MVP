import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Product columns to select for inventory view
const INVENTORY_PRODUCT_COLUMNS = [
  "id",
  "brand_id",
  "sku",
  "product_name",
  "description",
  "product_category",
  "unit_price",
  "cost_price",
  "currency",
  "quantity_in_stock",
  "allocated_stock",
  "inbound_stock",
  "available_stock",
  "reorder_level",
  "reorder_quantity",
  "low_stock_threshold",
  "critical_stock_threshold",
  "max_stock_threshold",
  "enable_stock_alerts",
  "last_stock_check",
  "status",
  "created_at",
  "updated_at",
].join(", ");

// Calculate stock status based on thresholds
function calculateStockStatus(
  quantityInStock: number,
  criticalThreshold: number = 0,
  lowThreshold: number = 0
): string {
  if (quantityInStock === 0) return "out_of_stock";
  if (quantityInStock <= criticalThreshold) return "critical";
  if (quantityInStock <= lowThreshold) return "low_stock";
  return "in_stock";
}

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

    // Get user profile
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const brandIdParam = searchParams.get("brand_id");
    const search = searchParams.get("search") || "";
    const stockStatus = searchParams.get("stock_status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);
    const sortBy = searchParams.get("sort_by") || "product_name";
    const sortOrder = searchParams.get("sort_order") === "desc" ? false : true;

    // Determine brand_id based on user role
    let brandId: string | null = null;
    if (profile.role_name === "super_admin") {
      brandId = brandIdParam || profile.brand_id;
    } else {
      brandId = profile.brand_id;
    }

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("products")
      .select(INVENTORY_PRODUCT_COLUMNS, { count: "exact" })
      .eq("brand_id", brandId)
      .eq("status", "active");

    // Apply search filter
    if (search) {
      const sanitizedSearch = search.replace(/[%_]/g, "\\$&");
      query = query.or(
        `sku.ilike.%${sanitizedSearch}%,product_name.ilike.%${sanitizedSearch}%`
      );
    }

    // Apply stock status filter
    if (stockStatus === "out_of_stock") {
      query = query.eq("quantity_in_stock", 0);
    } else if (stockStatus === "critical") {
      query = query.gt("quantity_in_stock", 0);
      // Will filter client-side for threshold comparison
    } else if (stockStatus === "low_stock") {
      // Will filter client-side for threshold comparison
    } else if (stockStatus === "in_stock") {
      query = query.gt("quantity_in_stock", 0);
    }

    // Apply sorting
    const validSortColumns = [
      "product_name",
      "sku",
      "quantity_in_stock",
      "available_stock",
      "unit_price",
      "updated_at",
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "product_name";
    query = query.order(sortColumn, { ascending: sortOrder });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: products, error: queryError, count } = await query;

    if (queryError) {
      console.error("Error fetching inventory products:", queryError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    // Process products and add computed fields
    const processedProducts = (products || []).map((product: any) => {
      const quantityInStock = product.quantity_in_stock || 0;
      const unitPrice = product.unit_price || 0;
      const criticalThreshold = product.critical_stock_threshold || 0;
      const lowThreshold = product.low_stock_threshold || product.reorder_level || 0;

      const stockStatus = calculateStockStatus(
        quantityInStock,
        criticalThreshold,
        lowThreshold
      );

      const stockValue = quantityInStock * unitPrice;

      return {
        ...product,
        stock_value: stockValue,
        stock_status: stockStatus,
        // Ensure defaults for nullable fields
        allocated_stock: product.allocated_stock || 0,
        inbound_stock: product.inbound_stock || 0,
        available_stock: product.available_stock ?? (quantityInStock - (product.allocated_stock || 0)),
        low_stock_threshold: lowThreshold,
        critical_stock_threshold: criticalThreshold,
        enable_stock_alerts: product.enable_stock_alerts ?? true,
      };
    });

    // Client-side filtering for stock status that requires threshold comparison
    let filteredProducts = processedProducts;
    if (stockStatus === "critical") {
      filteredProducts = processedProducts.filter(
        (p) => p.stock_status === "critical"
      );
    } else if (stockStatus === "low_stock") {
      filteredProducts = processedProducts.filter(
        (p) => p.stock_status === "low_stock"
      );
    }

    // Calculate summary stats
    const summary = {
      total_products: count || 0,
      total_value: filteredProducts.reduce((sum, p) => sum + (p.stock_value || 0), 0),
      out_of_stock_count: processedProducts.filter((p) => p.stock_status === "out_of_stock").length,
      critical_count: processedProducts.filter((p) => p.stock_status === "critical").length,
      low_stock_count: processedProducts.filter((p) => p.stock_status === "low_stock").length,
      in_stock_count: processedProducts.filter((p) => p.stock_status === "in_stock").length,
    };

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      products: filteredProducts,
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Unexpected error in inventory products endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

