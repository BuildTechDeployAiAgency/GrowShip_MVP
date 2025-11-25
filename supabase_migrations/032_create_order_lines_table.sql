-- ================================================
-- MIGRATION 032: CREATE ORDER LINES TABLE
-- ================================================
-- Description: Create normalized order_lines table to replace/complement JSONB items
-- Date: November 18, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE ORDER_LINES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity >= 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  discount NUMERIC(10,2) DEFAULT 0 CHECK (discount >= 0),
  tax NUMERIC(10,2) DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount + tax) STORED,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_product_id ON order_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_sku ON order_lines(sku);
CREATE INDEX IF NOT EXISTS idx_order_lines_created_at ON order_lines(created_at DESC);

-- ================================================
-- 3. CREATE RLS POLICIES
-- ================================================

ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

-- Users can view order lines for their brand
CREATE POLICY "Users can view order lines for their brand"
ON order_lines FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
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

-- Distributor admins can view order lines for their distributor
CREATE POLICY "Distributor admins can view order lines for their distributor"
ON order_lines FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
  )
);

-- Brand users can manage order lines for their brand's orders
CREATE POLICY "Brand users can manage order lines for their brand"
ON order_lines FOR ALL
USING (
  order_id IN (
    SELECT id FROM orders 
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

-- Distributor admins can manage order lines for their orders
CREATE POLICY "Distributor admins can manage order lines for their distributor"
ON order_lines FOR ALL
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE distributor_id IN (
      SELECT distributor_id FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND distributor_id IS NOT NULL
    )
    AND brand_id IN (
      SELECT brand_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- ================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_order_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_lines_updated_at ON order_lines;
CREATE TRIGGER update_order_lines_updated_at
  BEFORE UPDATE ON order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_order_lines_updated_at();

-- ================================================
-- 5. ADD COMMENTS
-- ================================================

COMMENT ON TABLE order_lines IS 'Normalized line items for orders, complements JSONB items array';
COMMENT ON COLUMN order_lines.order_id IS 'Foreign key to orders table';
COMMENT ON COLUMN order_lines.product_id IS 'Foreign key to products table, nullable for legacy/external SKUs';
COMMENT ON COLUMN order_lines.sku IS 'Product SKU identifier';
COMMENT ON COLUMN order_lines.quantity IS 'Quantity ordered';
COMMENT ON COLUMN order_lines.unit_price IS 'Price per unit';
COMMENT ON COLUMN order_lines.discount IS 'Discount amount applied to this line';
COMMENT ON COLUMN order_lines.tax IS 'Tax amount for this line';
COMMENT ON COLUMN order_lines.total IS 'Computed column: (quantity * unit_price) - discount + tax';

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM order_lines LIMIT 5;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_lines' ORDER BY ordinal_position;

