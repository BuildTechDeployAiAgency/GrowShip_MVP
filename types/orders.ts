export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_paid";
export type FulfilmentStatus = "pending" | "partial" | "fulfilled";

export type SalesChannel = 
  | "portal" 
  | "edi" 
  | "shopify" 
  | "amazon" 
  | "direct" 
  | "api" 
  | "other";

export interface OrderLine {
  id: string;
  order_id: string;
  product_id?: string;
  sku: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number; // Cost at time of order for margin calculations
  margin?: number; // Computed: unit_price - unit_cost
  margin_percent?: number; // Computed: ((unit_price - unit_cost) / unit_price) * 100
  discount?: number;
  tax?: number;
  total: number;
  currency?: string;
  notes?: string;
  shipped_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_date: string;
  user_id: string;
  brand_id: string;
  distributor_id?: string;
  purchase_order_id?: string;
  // Joined relation from purchase_orders table
  purchase_orders?: {
    id: string;
    po_number: string;
  } | null;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_type?: "retail" | "wholesale" | "distributor" | "manufacturer";
  items: any[];
  // Campaign & Channel tracking
  campaign_id?: string; // Links order to marketing campaigns for Target vs Actuals
  sales_channel?: SalesChannel | string; // Source channel: portal, edi, shopify, etc.
  // Shipping details
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  shipping_method?: string;
  // Geographic normalization
  territory_id?: string;
  region_id?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  // Financial details
  subtotal: number;
  discount_total?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount: number;
  currency?: string;
  payment_method?: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  fulfilment_status?: FulfilmentStatus;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface OrderFilters {
  status: string;
  paymentStatus: string;
  customerType: string;
  dateRange: string;
  distributorId?: string;
  campaignId?: string;
  salesChannel?: string;
}

// Order profitability view type (from order_profitability_view)
export interface OrderProfitability {
  order_id: string;
  order_number: string;
  order_date: string;
  brand_id: string;
  distributor_id?: string;
  campaign_id?: string;
  sales_channel?: string;
  customer_name: string;
  order_revenue: number;
  order_cost: number;
  order_profit: number;
  profit_margin_percent: number;
  line_count: number;
  total_units: number;
}

// Campaign performance metrics type
export interface CampaignPerformance {
  campaign_id: string;
  total_orders: number;
  total_revenue: number;
  total_units: number;
  avg_order_value: number;
  unique_customers: number;
}

// Sales channel performance type
export interface SalesChannelPerformance {
  sales_channel: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  order_count_percent: number;
}

