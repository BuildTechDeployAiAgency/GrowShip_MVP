// Types for Orders Import Feature

export type ImportType = "orders" | "products" | "customers";

export type ImportStatus = "processing" | "completed" | "failed" | "partial";

export interface ImportLog {
  id: string;
  user_id: string;
  brand_id: string;
  distributor_id?: string;
  import_type: ImportType;
  file_name: string;
  file_hash: string;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  status: ImportStatus;
  error_details?: ValidationError[];
  metadata?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  code: string;
  value?: any;
}

export interface ParsedOrderItem {
  sku: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  total?: number;
}

export interface ParsedOrder {
  row: number;
  order_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_type?: "retail" | "wholesale" | "distributor" | "manufacturer";
  items: ParsedOrderItem[];
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  shipping_method?: string;
  shipping_cost?: number;
  discount_total?: number;
  tax_total?: number;
  notes?: string;
  payment_method?: string;
  payment_status?: string;
  distributor_id?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
  validOrders: ParsedOrder[];
  invalidOrders: ParsedOrder[];
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  importLogId: string;
  errors?: ValidationError[];
}

export type FieldDataType = "string" | "number" | "date" | "boolean" | "email" | "phone";

export interface TemplateFieldConfig {
  name: string;
  header: string;
  isRequired: boolean;
  dataType: FieldDataType;
  description?: string;
  example?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  width?: number;
  enabled?: boolean;
}

export interface TemplateConfig {
  type: ImportType;
  fields: TemplateFieldConfig[];
  instructions?: string[];
}

export interface FileUploadResponse {
  success: boolean;
  data?: {
    orders: ParsedOrder[];
    totalCount: number;
    fileHash: string;
    fileName: string;
    fileSize: number;
    brandId: string;
    extractedDistributorId?: string;
    distributorIdConsistent: boolean;
  };
  error?: string;
}

export interface ValidationResponse {
  success: boolean;
  data?: ValidationResult;
  error?: string;
}

export interface ImportResponse {
  success: boolean;
  data?: ImportSummary;
  error?: string;
}

