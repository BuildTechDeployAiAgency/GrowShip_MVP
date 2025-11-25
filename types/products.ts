export type ProductStatus =
  | "active"
  | "inactive"
  | "discontinued"
  | "out_of_stock";

export interface Product {
  id: string;
  brand_id: string;
  sku: string;
  product_name: string;
  description?: string;
  product_category?: string;
  unit_price: number;
  cost_price?: number;
  currency?: string;
  quantity_in_stock: number;
  reorder_level?: number;
  reorder_quantity?: number;
  barcode?: string;
  product_image_url?: string;
  weight?: number;
  weight_unit?: string;
  status: ProductStatus;
  tags?: string[];
  supplier_id?: string;
  supplier_sku?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Inventory tracking fields
  allocated_stock?: number;
  inbound_stock?: number;
  available_stock?: number;
  
  // Stock alert thresholds
  low_stock_threshold?: number;
  critical_stock_threshold?: number;
  max_stock_threshold?: number;
  enable_stock_alerts?: boolean;
  last_stock_check?: string;
}

// Stock status for inventory filtering
export type StockStatusType = "in_stock" | "low_stock" | "critical" | "out_of_stock" | "healthy";

// Product with computed inventory values
export interface ProductWithInventory extends Product {
  stock_value?: number;
  stock_status?: StockStatusType;
}

export interface ProductFilters {
  status: string;
  category: string;
}

