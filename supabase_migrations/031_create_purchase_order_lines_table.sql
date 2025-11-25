-- ================================================
-- MIGRATION 031: CREATE PURCHASE ORDER LINES TABLE
-- ================================================
-- Description: Create normalized purchase_order_lines table to replace JSONB items
-- Date: November 18, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE PURCHASE_ORDER_LINES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity >= 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po_id ON purchase_order_lines(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_product_id ON purchase_order_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_sku ON purchase_order_lines(sku);

-- ================================================
-- 3. CREATE RLS POLICIES
-- ================================================

ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- Users can view PO lines for their brand
CREATE POLICY "Users can view PO lines for their brand"
ON purchase_order_lines FOR SELECT
USING (
  purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- Distributor admins can view PO lines for their distributor
CREATE POLICY "Distributor admins can view PO lines for their distributor"
ON purchase_order_lines FOR SELECT
USING (
  purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
  )
);

-- Users can manage PO lines for their brand's POs
CREATE POLICY "Users can manage PO lines for their brand"
ON purchase_order_lines FOR ALL
USING (
  purchase_order_id IN (
    SELECT id FROM purchase_orders 
    WHERE brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
      AND distributor_id IS NULL  -- Not a distributor admin
    )
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND (role_name = 'super_admin' OR role_type = 'super_admin')
  )
);

-- ================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_purchase_order_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_purchase_order_lines_updated_at ON purchase_order_lines;
CREATE TRIGGER update_purchase_order_lines_updated_at
  BEFORE UPDATE ON purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_lines_updated_at();

-- ================================================
-- 5. ADD COMMENTS
-- ================================================

COMMENT ON TABLE purchase_order_lines IS 'Normalized line items for purchase orders';
COMMENT ON COLUMN purchase_order_lines.purchase_order_id IS 'Foreign key to purchase_orders table';
COMMENT ON COLUMN purchase_order_lines.product_id IS 'Foreign key to products table, nullable for legacy/external SKUs';
COMMENT ON COLUMN purchase_order_lines.sku IS 'Product SKU identifier';
COMMENT ON COLUMN purchase_order_lines.quantity IS 'Quantity ordered';
COMMENT ON COLUMN purchase_order_lines.unit_price IS 'Price per unit';
COMMENT ON COLUMN purchase_order_lines.total IS 'Computed column: quantity * unit_price';

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM purchase_order_lines LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'purchase_order_lines' ORDER BY ordinal_position;

