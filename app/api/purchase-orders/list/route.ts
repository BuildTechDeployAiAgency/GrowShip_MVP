import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PurchaseOrderFilters } from "@/types/purchase-orders";

// Select all PO columns plus the distributor name via a join
const PURCHASE_ORDER_COLUMNS_WITH_DISTRIBUTOR = `
  id,
  po_number,
  po_date,
  user_id,
  brand_id,
  distributor_id,
  supplier_id,
  supplier_name,
  supplier_email,
  supplier_phone,
  subtotal,
  tax_total,
  shipping_cost,
  total_amount,
  currency,
  po_status,
  payment_status,
  expected_delivery_date,
  actual_delivery_date,
  submitted_at,
  approved_at,
  approved_by,
  rejection_reason,
  notes,
  tags,
  created_at,
  updated_at,
  created_by,
  updated_by,
  distributors(name)
`;

interface PurchaseOrdersListRequest {
  page?: number;
  pageSize?: number;
  filters?: PurchaseOrderFilters;
  searchTerm?: string;
  brandId?: string;
  distributorId?: string;
}

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%_]/g, "\\$&");
}

function applyDateFilter(query: any, filters?: PurchaseOrderFilters) {
  if (!filters || filters.dateRange === "all") {
    return query;
  }

  const now = new Date();
  let startDate: Date | null = null;

  switch (filters.dateRange) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = null;
  }

  if (startDate) {
    return query.gte("po_date", startDate.toISOString());
  }

  return query;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as PurchaseOrdersListRequest;
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
  const pageSize = Math.min(Math.max(payload.pageSize ?? 25, 1), 100);
  const filters = payload.filters ?? {
    status: "all",
    paymentStatus: "all",
    dateRange: "all",
  };
  const searchTerm = payload.searchTerm?.trim() ?? "";

  // Use exact count - with proper indexes, this should be fast
  // The new indexes in migration 039 optimize count queries
  // Join with distributors table to get the actual distributor name
  let query = supabase
    .from("purchase_orders")
    .select(PURCHASE_ORDER_COLUMNS_WITH_DISTRIBUTOR, { count: "exact" });

  // Apply filters in order of selectivity (most selective first)
  // This helps the query planner choose the best index

  // 1. Brand filter (highly selective)
  if (payload.brandId) {
    query = query.eq("brand_id", payload.brandId);
  }

  // 2. Distributor filter (highly selective when specified)
  const distributorFilter =
    payload.distributorId && payload.distributorId !== "all"
      ? payload.distributorId
      : filters.distributorId && filters.distributorId !== "all"
      ? filters.distributorId
      : undefined;

  if (distributorFilter) {
    query = query.eq("distributor_id", distributorFilter);
  }

  // 3. Status filters (moderately selective)
  if (filters.status && filters.status !== "all") {
    query = query.eq("po_status", filters.status);
  }

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  // 4. Date range filter (moderately selective)
  query = applyDateFilter(query, filters);

  // 5. Text search (least selective, applied last)
  // With trigram indexes (migration 039), ILIKE searches are much faster
  if (searchTerm) {
    const sanitized = sanitizeSearchTerm(searchTerm);
    query = query.or(
      `po_number.ilike.%${sanitized}%,supplier_name.ilike.%${sanitized}%,supplier_email.ilike.%${sanitized}%`
    );
  }

  // Apply ordering and pagination
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("po_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[PurchaseOrdersList] Failed to fetch purchase orders", error);
    return NextResponse.json(
      { ok: false, message: `Failed to load purchase orders: ${error.message}`, details: error },
      { status: 500 }
    );
  }

  // Post-process data to use the actual distributor name instead of "Your Distributor Account"
  const processedData = (data ?? []).map((po: any) => {
    // If there's a joined distributor with a name, use it as supplier_name
    const distributorName = po.distributors?.name;
    if (distributorName) {
      return {
        ...po,
        supplier_name: distributorName,
        distributors: undefined, // Remove the nested object from response
      };
    }
    // Remove the distributors nested object even if no name
    const { distributors, ...rest } = po;
    return rest;
  });

  return NextResponse.json({
    ok: true,
    data: processedData,
    totalCount: count ?? 0,
    page,
    pageSize,
  });
}

