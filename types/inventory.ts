// ================================================
// INVENTORY MODULE TYPES
// ================================================

export type TransactionType =
  | "PO_APPROVED"
  | "PO_RECEIVED"
  | "PO_CANCELLED"
  | "ORDER_ALLOCATED"
  | "ORDER_FULFILLED"
  | "ORDER_CANCELLED"
  | "MANUAL_ADJUSTMENT"
  | "STOCKTAKE_ADJUSTMENT";

export type TransactionStatus = "pending" | "completed" | "cancelled" | "reversed";

export type SourceType =
  | "purchase_order"
  | "order"
  | "manual"
  | "stocktake"
  | "correction"
  | "return"
  | "damaged";

export type ThresholdType = "out_of_stock" | "critical" | "low" | "overstock" | "healthy";

export interface InventoryTransaction {
  id: string;
  product_id: string | null;
  sku: string;
  product_name: string | null;
  transaction_type: TransactionType;
  transaction_date: string;
  source_type: SourceType | null;
  source_id: string | null;
  reference_number: string | null;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  allocated_before: number;
  allocated_after: number;
  inbound_before: number;
  inbound_after: number;
  status: TransactionStatus;
  notes: string | null;
  brand_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockBreakdown {
  product_id: string;
  sku: string;
  product_name: string;
  on_hand: number;
  allocated: number;
  available: number;
  inbound: number;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  enable_stock_alerts: boolean;
}

export interface StockThreshold {
  product_id: string;
  sku: string;
  product_name: string;
  current_stock: number;
  available_stock: number;
  threshold_type: ThresholdType;
  threshold_value: number;
  shortfall: number;
}

export interface InventorySummaryWithAlerts {
  total_products: number;
  total_value: number;
  total_on_hand: number;
  total_allocated: number;
  total_available: number;
  total_inbound: number;
  low_stock_count: number;
  critical_stock_count: number;
  out_of_stock_count: number;
  overstock_count: number;
  healthy_count: number;
}

export interface ManualAdjustmentRequest {
  product_id: string;
  adjustment_type: "manual" | "stocktake" | "correction" | "damaged" | "return";
  quantity_change: number;
  reason: string;
  reference_number?: string;
  notes?: string;
}

export interface BulkAdjustmentRequest {
  adjustments: Array<{
    product_id: string;
    quantity_change: number;
    notes?: string;
  }>;
  adjustment_type: "stocktake" | "correction";
  reference_number: string;
}

export interface StockAvailabilityCheck {
  sufficient: boolean;
  details: Array<{
    product_id: string;
    sku: string;
    product_name: string;
    requested: number;
    available: number;
    shortfall: number;
  }>;
}

export interface TransactionFilters {
  product_id?: string;
  sku?: string;
  transaction_type?: TransactionType;
  source_type?: SourceType;
  source_id?: string;
  date_from?: string;
  date_to?: string;
  status?: TransactionStatus;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  transactions: InventoryTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ProductStockHistory {
  transactions: InventoryTransaction[];
  stock_levels_over_time: Array<{
    date: string;
    quantity: number;
    allocated: number;
    available: number;
    inbound: number;
  }>;
  summary: {
    total_inbound: number;
    total_outbound: number;
    total_adjustments: number;
    net_change: number;
  };
}

// Extended Product type with inventory fields
export interface ProductWithInventory {
  id: string;
  brand_id: string;
  sku: string;
  product_name: string;
  description?: string;
  product_category?: string;
  unit_price: number;
  cost_price?: number;
  currency: string;
  
  // Stock levels
  quantity_in_stock: number;
  allocated_stock: number;
  inbound_stock: number;
  available_stock: number;
  
  // Thresholds
  reorder_level?: number;
  reorder_quantity?: number;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  max_stock_threshold?: number;
  enable_stock_alerts: boolean;
  
  // Metadata
  last_stock_check?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

