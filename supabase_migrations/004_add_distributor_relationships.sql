-- =====================================================
-- Migration 004: Add Distributor Relationships
-- =====================================================
-- Description: Add distributor_id foreign keys to related tables
-- Date: 2025-11-04
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- ================================================
-- SALES_DATA TABLE
-- ================================================

-- Add distributor_id column
ALTER TABLE sales_data ADD COLUMN IF NOT EXISTS distributor_id uuid;

-- Add foreign key constraint
ALTER TABLE sales_data 
  ADD CONSTRAINT sales_data_distributor_id_fkey 
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE CASCADE;

-- Note: NOT NULL constraint will be added after data migration in production
-- For now, making it nullable for gradual migration
-- ALTER TABLE sales_data ALTER COLUMN distributor_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_data_distributor_id ON sales_data(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_distributor ON sales_data(brand_id, distributor_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_brand_distributor_date ON sales_data(brand_id, distributor_id, sales_date);

-- ================================================
-- ORDERS TABLE
-- ================================================

-- Add distributor_id column (nullable - not all orders may be associated with a distributor)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distributor_id uuid;

-- Add foreign key constraint
ALTER TABLE orders 
  ADD CONSTRAINT orders_distributor_id_fkey 
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_distributor_id ON orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_orders_brand_distributor ON orders(brand_id, distributor_id);
CREATE INDEX IF NOT EXISTS idx_orders_distributor_date ON orders(distributor_id, order_date);

-- ================================================
-- PURCHASE_ORDERS TABLE
-- ================================================

-- Add distributor_id column (nullable)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS distributor_id uuid;

-- Add foreign key constraint
ALTER TABLE purchase_orders 
  ADD CONSTRAINT purchase_orders_distributor_id_fkey 
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_distributor_id ON purchase_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_brand_distributor ON purchase_orders(brand_id, distributor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_distributor_date ON purchase_orders(distributor_id, po_date);

-- ================================================
-- INVOICES TABLE
-- ================================================

-- Add distributor_id column (nullable - derived from order_id but cached for performance)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS distributor_id uuid;

-- Add foreign key constraint
ALTER TABLE invoices 
  ADD CONSTRAINT invoices_distributor_id_fkey 
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_distributor_id ON invoices(distributor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_brand_distributor ON invoices(brand_id, distributor_id);

-- ================================================
-- SHIPMENTS TABLE
-- ================================================

-- Add distributor_id column (nullable - derived from order_id but cached for performance)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS distributor_id uuid;

-- Add foreign key constraint
ALTER TABLE shipments 
  ADD CONSTRAINT shipments_distributor_id_fkey 
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shipments_distributor_id ON shipments(distributor_id);
CREATE INDEX IF NOT EXISTS idx_shipments_brand_distributor ON shipments(brand_id, distributor_id);

-- ================================================
-- CREATE TRIGGER TO AUTO-POPULATE DISTRIBUTOR_ID IN INVOICES
-- ================================================

CREATE OR REPLACE FUNCTION populate_invoice_distributor_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate distributor_id from related order if available
  IF NEW.order_id IS NOT NULL THEN
    SELECT distributor_id INTO NEW.distributor_id
    FROM orders
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_invoice_distributor_id ON invoices;
CREATE TRIGGER trigger_populate_invoice_distributor_id
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION populate_invoice_distributor_id();

-- ================================================
-- CREATE TRIGGER TO AUTO-POPULATE DISTRIBUTOR_ID IN SHIPMENTS
-- ================================================

CREATE OR REPLACE FUNCTION populate_shipment_distributor_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate distributor_id from related order if available
  IF NEW.order_id IS NOT NULL THEN
    SELECT distributor_id INTO NEW.distributor_id
    FROM orders
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_shipment_distributor_id ON shipments;
CREATE TRIGGER trigger_populate_shipment_distributor_id
  BEFORE INSERT OR UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION populate_shipment_distributor_id();

-- Add comments
COMMENT ON COLUMN sales_data.distributor_id IS 'Foreign key to distributors table. Sales data must be associated with a distributor.';
COMMENT ON COLUMN orders.distributor_id IS 'Foreign key to distributors table. Optional - not all orders are distributor orders.';
COMMENT ON COLUMN purchase_orders.distributor_id IS 'Foreign key to distributors table. Optional - PO may be direct or through distributor.';
COMMENT ON COLUMN invoices.distributor_id IS 'Foreign key to distributors table. Auto-populated from order if available.';
COMMENT ON COLUMN shipments.distributor_id IS 'Foreign key to distributors table. Auto-populated from order if available.';

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM sales_data WHERE distributor_id IS NOT NULL;
-- SELECT COUNT(*) FROM orders WHERE distributor_id IS NOT NULL;
-- SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'distributor_id';

