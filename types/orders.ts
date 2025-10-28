// Order Types and Interfaces

export type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "processing" 
  | "shipped" 
  | "delivered" 
  | "cancelled";

export type PaymentStatus = 
  | "pending" 
  | "paid" 
  | "failed" 
  | "refunded" 
  | "partially_paid";

export type CustomerType = 
  | "retail" 
  | "wholesale" 
  | "distributor" 
  | "manufacturer";

export interface OrderItem {
  product_id?: string;
  product_name: string;
  product_sku?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  line_total: number;
  notes?: string;
}

export interface OrderCustomer {
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_type?: CustomerType;
}

export interface OrderShipping {
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  zip_code?: string;
  country: string;
  shipping_method?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_date: string;
  user_id: string;
  organization_id: string;
  
  // Customer information
  customer: OrderCustomer;
  
  // Order items
  items: OrderItem[];
  
  // Shipping information
  shipping?: OrderShipping;
  
  // Financial details
  subtotal: number;
  discount_total?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount: number;
  currency?: string;
  
  // Payment details
  payment_method?: string;
  payment_status: PaymentStatus;
  
  // Order status
  order_status: OrderStatus;
  
  // Additional information
  notes?: string;
  tags?: string[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface OrderCreateInput {
  order_number: string;
  order_date: string;
  customer: OrderCustomer;
  items: OrderItem[];
  shipping?: OrderShipping;
  subtotal: number;
  discount_total?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount: number;
  currency?: string;
  payment_method?: string;
  payment_status?: PaymentStatus;
  order_status?: OrderStatus;
  notes?: string;
  tags?: string[];
}

export interface OrderUpdateInput {
  order_status?: OrderStatus;
  payment_status?: PaymentStatus;
  shipping?: OrderShipping;
  notes?: string;
  tags?: string[];
}

export interface OrderListResponse {
  data: Order[];
  total: number;
  offset: number;
  limit: number;
  filters?: OrderFilterParams;
}

export interface OrderFilterParams {
  order_status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search_query?: string;
}

export interface OrderSummaryStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_payment_status: Record<PaymentStatus, number>;
  top_customers: Array<{
    customer_id: string;
    customer_name: string;
    total_orders: number;
    total_revenue: number;
  }>;
  recent_orders: Order[];
}

// Helper type for order display in tables
export interface OrderTableRow {
  id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  total_amount: number;
  currency: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  items_count: number;
}

// Database table type for Supabase
export interface Database {
  public: {
    Tables: {
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Order, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}
