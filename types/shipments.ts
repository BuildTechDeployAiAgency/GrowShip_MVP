export type ShipmentStatus = "pending" | "processing" | "in_transit" | "out_for_delivery" | "shipped" | "delivered" | "failed" | "returned" | "cancelled";

export interface Shipment {
  id: string;
  shipment_number: string;
  order_id: string;
  po_id?: string; // Using existing column name
  user_id?: string;
  distributor_id?: string;
  brand_id: string;
  
  // Status (using existing column name)
  shipment_status: ShipmentStatus;
  
  // Shipping details
  carrier?: string;
  tracking_number?: string;
  shipping_method?: string;
  shipping_cost?: number;
  
  // Address fields
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  
  // Dates
  shipped_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string; // Using existing column name
  
  // Totals
  total_items_shipped?: number;
  total_value?: number;
  
  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
  
  // Audit fields
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  shipment_items?: ShipmentItem[];
  order?: {
    order_number: string;
    customer_name: string;
  };
}

export interface ShipmentItem {
  id: string;
  shipment_id: string;
  order_line_id?: string;
  product_id?: string;
  
  // Product info
  sku: string;
  product_name?: string;
  
  // Quantities
  quantity_shipped: number;
  
  // Pricing
  unit_price?: number;
  cost_price?: number;
  total_value?: number;
  
  // Audit fields
  created_at: string;
  updated_at: string;
}

export interface ShipmentFilters {
  status: string;
  dateRange: string;
  distributorId?: string;
}

export interface CreateShipmentItem {
  order_line_id: string;
  product_id?: string;
  sku: string;
  product_name?: string;
  quantity_to_ship: number;
  unit_price?: number;
}

export interface CreateShipmentInput {
  order_id: string;
  carrier?: string;
  tracking_number?: string;
  shipping_method?: string;
  notes?: string;
  items: CreateShipmentItem[];
}

export interface CreateShipmentResult {
  success: boolean;
  error?: string;
  shipment_id?: string;
  shipment_number?: string;
  total_items?: number;
  total_value?: number;
  fulfilment_status?: string;
}

export interface UpdateShipmentStatusResult {
  success: boolean;
  error?: string;
  shipment_id?: string;
  new_status?: ShipmentStatus;
}

