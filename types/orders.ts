export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_paid";

export interface OrderLine {
  id: string;
  order_id: string;
  product_id?: string;
  sku: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax?: number;
  total: number;
  currency?: string;
  notes?: string;
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
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_type?: "retail" | "wholesale" | "distributor" | "manufacturer";
  items: any[];
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  shipping_method?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  subtotal: number;
  discount_total?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount: number;
  currency?: string;
  payment_method?: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
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
}

