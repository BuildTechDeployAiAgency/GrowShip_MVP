import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProductFilters } from "@/types/products";

const PRODUCT_COLUMNS = [
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
  "reorder_level",
  "reorder_quantity",
  "barcode",
  "product_image_url",
  "weight",
  "weight_unit",
  "status",
  "tags",
  "supplier_id",
  "supplier_sku",
  "notes",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  // Inventory tracking fields
  "allocated_stock",
  "inbound_stock",
  "available_stock",
  // Stock alert thresholds
  "low_stock_threshold",
  "critical_stock_threshold",
  "max_stock_threshold",
  "enable_stock_alerts",
  "last_stock_check",
].join(", ");

interface ProductsListRequest {
  page?: number;
  pageSize?: number;
  filters?: ProductFilters;
  searchTerm?: string;
  brandId?: string;
  isSuperAdmin?: boolean;
}

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%_]/g, "\\$&");
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ProductsListRequest;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const page = Math.max(0, payload.page ?? 0);
  const pageSize = Math.min(Math.max(payload.pageSize ?? 25, 1), 200);
  const filters = payload.filters ?? { status: "all", category: "all" };
  const searchTerm = payload.searchTerm?.trim() ?? "";
  const isSuperAdmin = Boolean(payload.isSuperAdmin);

  if (!isSuperAdmin && !payload.brandId) {
    return NextResponse.json(
      { ok: false, message: "Brand context is required" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS, { count: "exact" });

  if (payload.brandId) {
    query = query.eq("brand_id", payload.brandId);
  }

  if (searchTerm) {
    const sanitized = sanitizeSearchTerm(searchTerm);
    query = query.or(
      `sku.ilike.%${sanitized}%,product_name.ilike.%${sanitized}%,product_category.ilike.%${sanitized}%,barcode.ilike.%${sanitized}%`
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("product_category", filters.category);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[ProductsList] Failed to fetch products", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load products" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: data ?? [],
    totalCount: count ?? 0,
    page,
    pageSize,
  });
}

