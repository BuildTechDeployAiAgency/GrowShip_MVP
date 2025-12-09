export type PaymentMethod = 
  | "cash" 
  | "bank_transfer" 
  | "credit" 
  | "check" 
  | "wire_transfer" 
  | "other";

export type PaymentLineStatus = 
  | "pending" 
  | "verified" 
  | "rejected";

export interface PaymentLine {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  status: PaymentLineStatus;
  
  // Audit fields
  created_by?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  
  // Related data (when joined)
  payment_attachments?: PaymentAttachment[] | { count: number };
}

export interface PaymentAttachment {
  id: string;
  payment_line_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  
  // Audit fields
  uploaded_by: string;
  created_at: string;
}

export interface PaymentSummary {
  invoice_id: string;
  invoice_number: string;
  total_amount: number;
  payment_status: string;
  paid_amount: number;
  pending_amount: number;
  outstanding_amount: number;
  pending_payments_count: number;
}

export interface CreatePaymentLineRequest {
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export interface UpdatePaymentLineRequest {
  amount?: number;
  payment_method?: PaymentMethod;
  payment_date?: string;
  reference_number?: string;
  notes?: string;
  status?: PaymentLineStatus; // Only for admins
}

export interface AttachmentDownload {
  downloadUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

// Form interfaces for components
export interface PaymentLineFormData {
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number: string;
  notes: string;
}

export interface PaymentLineWithAttachments extends PaymentLine {
  payment_attachments: PaymentAttachment[];
  attachments_count?: number;
}