import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OrderFilters } from "@/types/orders";

const ORDER_LIST_COLUMNS = [
  "id",
  "order_number",
  "order_date",
  "user_id",
  "brand_id",
  "distributor_id",
  "purchase_order_id",
  "customer_id",
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_type",
  "items",
  "shipping_address_line1",
  "shipping_address_line2",
  "shipping_city",
  "shipping_state",
  "shipping_zip_code",
  "shipping_country",
  "shipping_method",
  "tracking_number",
  "estimated_delivery_date",
  "actual_delivery_date",
  "subtotal",
  "discount_total",
  "tax_total",
  "shipping_cost",
  "total_amount",
  "currency",
  "payment_method",
  "payment_status",
  "order_status",
  "notes",
  "tags",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
].join(", ");

interface OrdersListRequest {
  page?: number;
  pageSize?: number;
  filters?: OrderFilters;
  searchTerm?: string;
  brandId?: string;
  distributorId?: string;
}

function sanitizeSearchTerm(term: string) {
  return term.replace(/[%_]/g, "\\$&");
}

function applyDateFilter(query: any, filters?: OrderFilters) {
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
    return query.gte("order_date", startDate.toISOString());
  }

  return query;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as OrdersListRequest;
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
    customerType: "all",
    dateRange: "all",
  };
  const searchTerm = payload.searchTerm?.trim() ?? "";

  let query = supabase
    .from("orders")
    .select(ORDER_LIST_COLUMNS, { count: "exact" });

  const distributorFilter =
    payload.distributorId && payload.distributorId !== "all"
      ? payload.distributorId
      : filters.distributorId && filters.distributorId !== "all"
      ? filters.distributorId
      : undefined;

  if (distributorFilter) {
    query = query.eq("distributor_id", distributorFilter);
  }

  if (payload.brandId) {
    query = query.eq("brand_id", payload.brandId);
  }

  if (searchTerm) {
    const sanitized = sanitizeSearchTerm(searchTerm);
    query = query.or(
      `order_number.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%,customer_email.ilike.%${sanitized}%`
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("order_status", filters.status);
  }

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters.customerType && filters.customerType !== "all") {
    query = query.eq("customer_type", filters.customerType);
  }

  query = applyDateFilter(query, filters);

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("order_date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[OrdersList] Failed to fetch orders", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load orders" },
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

