-- Invoice Payment Lines and Proof Management System
-- Date: 2025-12-11
-- Purpose: Enhanced invoice payment tracking with line items and file attachments

-- Create invoice_payment_lines table for detailed payment tracking
CREATE TABLE IF NOT EXISTS invoice_payment_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL, -- cash, bank_transfer, credit, check, wire_transfer, other
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100), -- check number, transaction ID, etc.
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    
    -- Audit fields
    created_by UUID REFERENCES user_profiles(user_id),
    verified_by UUID REFERENCES user_profiles(user_id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create payment_attachments table for proof of payment files
CREATE TABLE IF NOT EXISTS payment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_line_id UUID NOT NULL REFERENCES invoice_payment_lines(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Supabase storage path
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, application/pdf, etc.
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    
    -- Audit fields
    uploaded_by UUID NOT NULL REFERENCES user_profiles(user_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_payment_lines_invoice_id ON invoice_payment_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_lines_status ON invoice_payment_lines(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_lines_payment_date ON invoice_payment_lines(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_attachments_payment_line_id ON payment_attachments(payment_line_id);

-- Enable Row Level Security
ALTER TABLE invoice_payment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_payment_lines

-- Users can view payment lines for invoices in their organization
CREATE POLICY "Users can view payment lines in their organization" ON invoice_payment_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_payment_lines.invoice_id
            AND (
                i.brand_id = (
                    SELECT up.organization_id 
                    FROM user_profiles up 
                    WHERE up.user_id = auth.uid()
                )
                OR
                i.distributor_id = (
                    SELECT up.organization_id 
                    FROM user_profiles up 
                    WHERE up.user_id = auth.uid()
                )
            )
        )
    );

-- Distributors can create payment lines for their own invoices
CREATE POLICY "Distributors can create payment lines" ON invoice_payment_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN user_profiles up ON up.user_id = auth.uid()
            WHERE i.id = invoice_payment_lines.invoice_id
            AND i.distributor_id = up.organization_id
        )
    );

-- Brand admins and super admins can create payment lines for any invoice in their organization
CREATE POLICY "Brand admins can create payment lines" ON invoice_payment_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN user_profiles up ON up.user_id = auth.uid()
            WHERE i.id = invoice_payment_lines.invoice_id
            AND i.brand_id = up.organization_id
            AND up.role_name IN ('brand_admin', 'super_admin')
        )
    );

-- Only brand admins and super admins can verify payments
CREATE POLICY "Only brand admins can verify payments" ON invoice_payment_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN user_profiles up ON up.user_id = auth.uid()
            WHERE i.id = invoice_payment_lines.invoice_id
            AND i.brand_id = up.organization_id
            AND up.role_name IN ('brand_admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN user_profiles up ON up.user_id = auth.uid()
            WHERE i.id = invoice_payment_lines.invoice_id
            AND i.brand_id = up.organization_id
            AND up.role_name IN ('brand_admin', 'super_admin')
        )
    );

-- Users can delete their own payment lines if not yet verified
CREATE POLICY "Users can delete unverified payment lines" ON invoice_payment_lines
    FOR DELETE USING (
        created_by = auth.uid() AND status = 'pending'
    );

-- RLS Policies for payment_attachments

-- Users can view attachments for payment lines they have access to
CREATE POLICY "Users can view payment attachments" ON payment_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoice_payment_lines ipl
            JOIN invoices i ON i.id = ipl.invoice_id
            WHERE ipl.id = payment_attachments.payment_line_id
            AND (
                i.brand_id = (
                    SELECT up.organization_id 
                    FROM user_profiles up 
                    WHERE up.user_id = auth.uid()
                )
                OR
                i.distributor_id = (
                    SELECT up.organization_id 
                    FROM user_profiles up 
                    WHERE up.user_id = auth.uid()
                )
            )
        )
    );

-- Users can upload attachments for payment lines they created
CREATE POLICY "Users can upload payment attachments" ON payment_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoice_payment_lines ipl
            WHERE ipl.id = payment_attachments.payment_line_id
            AND ipl.created_by = auth.uid()
        )
    );

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments" ON payment_attachments
    FOR DELETE USING (uploaded_by = auth.uid());

-- Create function to auto-update invoice payment status based on payment lines
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices 
    SET 
        payment_status = CASE
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payment_lines 
                WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
                AND status = 'verified'
            ) = 0 THEN 'pending'
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payment_lines 
                WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
                AND status = 'verified'
            ) >= total_amount THEN 'paid'
            ELSE 'partially_paid'
        END,
        paid_date = CASE
            WHEN (
                SELECT COALESCE(SUM(amount), 0) 
                FROM invoice_payment_lines 
                WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
                AND status = 'verified'
            ) >= total_amount THEN NOW()
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update invoice payment status
CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON invoice_payment_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Create function to update order payment status when invoice is fully paid
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when payment status changes to 'paid'
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
        -- Update the related order if it exists
        UPDATE orders 
        SET 
            payment_status = 'paid',
            updated_at = NOW()
        WHERE id = NEW.order_id AND NEW.order_id IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update order payment status when invoice is paid
CREATE TRIGGER trigger_update_order_payment_status
    AFTER UPDATE OF payment_status ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_status();

-- Update existing invoices to ensure due_date is set properly
-- This will be done in the next step when we update the invoice generation logic

-- Add constraints and validation
ALTER TABLE invoice_payment_lines 
    ADD CONSTRAINT chk_payment_method CHECK (
        payment_method IN ('cash', 'bank_transfer', 'credit', 'check', 'wire_transfer', 'other')
    );

-- Create view for payment summary
CREATE OR REPLACE VIEW invoice_payment_summary AS
SELECT 
    i.id as invoice_id,
    i.invoice_number,
    i.total_amount,
    i.payment_status,
    COALESCE(SUM(CASE WHEN ipl.status = 'verified' THEN ipl.amount ELSE 0 END), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN ipl.status = 'pending' THEN ipl.amount ELSE 0 END), 0) as pending_amount,
    i.total_amount - COALESCE(SUM(CASE WHEN ipl.status = 'verified' THEN ipl.amount ELSE 0 END), 0) as outstanding_amount,
    COUNT(CASE WHEN ipl.status = 'pending' THEN 1 END) as pending_payments_count
FROM invoices i
LEFT JOIN invoice_payment_lines ipl ON i.id = ipl.invoice_id
GROUP BY i.id, i.invoice_number, i.total_amount, i.payment_status;

-- Grant necessary permissions
GRANT SELECT ON invoice_payment_summary TO authenticated;

-- Create Supabase Storage bucket for payment attachments (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-attachments',
  'payment-attachments',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for Storage bucket access
CREATE POLICY "Users can view payment attachments they have access to" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'payment-attachments' 
        AND EXISTS (
            SELECT 1 FROM payment_attachments pa
            JOIN invoice_payment_lines ipl ON ipl.id = pa.payment_line_id
            JOIN invoices i ON i.id = ipl.invoice_id
            WHERE pa.file_path = storage.objects.name
            AND (
                i.brand_id = (
                    SELECT up.organization_id 
                    FROM user_profiles up 
                    WHERE up.user_id = auth.uid()
                )
                OR
                i.distributor_id = (
                    SELECT up.organization_id 
                    FROM user_profiles up 
                    WHERE up.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can upload payment attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'payment-attachments'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their own payment attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'payment-attachments'
        AND EXISTS (
            SELECT 1 FROM payment_attachments pa
            WHERE pa.file_path = storage.objects.name
            AND pa.uploaded_by = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON TABLE invoice_payment_lines IS 'Tracks individual payment line items for invoices with proof attachments';
COMMENT ON TABLE payment_attachments IS 'File attachments for payment proof (receipts, confirmations, etc.)';
COMMENT ON VIEW invoice_payment_summary IS 'Summary view of invoice payment status with totals';