export type POStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "ordered"
  | "received"
  | "cancelled";

export type PurchasePaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_paid";
export type PaymentStatus = PurchasePaymentStatus;

export type POLineStatus =
  | "pending"
  | "approved"
  | "partially_approved"
  | "backordered"
  | "rejected"
  | "cancelled";

export type BackorderStatus =
  | "pending"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled";

export type StockStatus = "sufficient" | "partial" | "insufficient";

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  product_id?: string;
  sku: string;
  product_name?: string;
  quantity: number; // Legacy field, same as requested_qty
  requested_qty: number;
  approved_qty: number;
  backorder_qty: number;
  rejected_qty: number;
  unit_price: number;
  total: number;
  currency?: string;
  line_status: POLineStatus;
  available_stock?: number;
  override_applied: boolean;
  override_by?: string;
  override_reason?: string;
  override_at?: string;
  line_notes?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface POBackorder {
  id: string;
  po_id: string;
  po_line_id: string;
  product_id?: string;
  sku: string;
  backorder_qty: number;
  expected_fulfillment_date?: string;
  backorder_status: BackorderStatus;
  fulfilled_qty: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface POApprovalHistory {
  id: string;
  po_id: string;
  action: string;
  actor_id: string;
  comments?: string;
  affected_line_ids?: string[];
  override_applied: boolean;
  stock_warnings?: Record<string, any>;
  generated_order_ids?: string[];
  backorder_references?: Record<string, any>;
  created_at: string;
}

export interface StockValidationResult {
  line_id: string;
  sku: string;
  requested_qty: number;
  available_stock: number;
  stock_status: StockStatus;
  can_approve: boolean;
  suggestion?: {
    type: "split" | "reduce" | "override";
    approved_qty?: number;
    backorder_qty?: number;
    message: string;
  };
}

export interface LineApprovalDecision {
  line_id: string;
  approved_qty: number;
  backorder_qty: number;
  rejected_qty?: number;
  override_applied: boolean;
  override_reason?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  user_id?: string;
  brand_id: string;
  distributor_id?: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  items: any[];
  subtotal?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount?: number;
  currency?: string;
  purchase_order_lines?: PurchaseOrderLine[];
  po_status: POStatus;
  payment_status: PurchasePaymentStatus;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  notes?: string;
  tags?: string[];
  // New approval summary fields
  total_requested_qty?: number;
  total_approved_qty?: number;
  total_backordered_qty?: number;
  fulfillment_percentage?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PurchaseOrderFilters {
  status: string;
  paymentStatus: string;
  dateRange: string;
  distributorId?: string;
}

