-- ================================================
-- MIGRATION 008: CREATE PRODUCTS TABLE
-- ================================================
-- Description: Create products table for inventory management
-- Date: November 5, 2025
-- Author: GrowShip MVP Team
-- ================================================

-- ================================================
-- 1. CREATE PRODUCT STATUS ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued', 'out_of_stock');
  END IF;
END $$;

-- ================================================
-- 2. CREATE PRODUCTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Product Identity
  sku varchar(100) UNIQUE NOT NULL,
  product_name varchar(255) NOT NULL,
  description text,
  product_category varchar(100),
  
  -- Pricing
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  cost_price numeric(10,2) CHECK (cost_price >= 0),
  currency varchar(3) DEFAULT 'USD',
  
  -- Inventory
  quantity_in_stock integer DEFAULT 0 CHECK (quantity_in_stock >= 0),
  reorder_level integer DEFAULT 0,
  reorder_quantity integer DEFAULT 0,
  
  -- Product Details
  barcode varchar(100),
  product_image_url text,
  weight numeric(10,2),
  weight_unit varchar(10) DEFAULT 'kg',
  
  -- Status & Classification
  status product_status DEFAULT 'active',
  tags text[],
  
  -- Supplier Info (optional)
  supplier_id uuid,
  supplier_sku varchar(100),
  
  -- Metadata
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- ================================================
-- 3. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(product_category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. CREATE RLS POLICIES
-- ================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view products from their brand" ON products;
DROP POLICY IF EXISTS "Users can create products for their brand" ON products;
DROP POLICY IF EXISTS "Users can update products from their brand" ON products;
DROP POLICY IF EXISTS "Users can delete products from their brand" ON products;
DROP POLICY IF EXISTS "Super admins can view all products" ON products;
DROP POLICY IF EXISTS "Super admins can manage all products" ON products;

-- Policy 1: Users can view products from their brand
CREATE POLICY "Users can view products from their brand"
  ON products
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Users can create products for their brand
CREATE POLICY "Users can create products for their brand"
  ON products
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND user_status = 'approved'
    )
  );

-- Policy 3: Users can update products from their brand
CREATE POLICY "Users can update products from their brand"
  ON products
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT brand_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND user_status = 'approved'
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND user_status = 'approved'
    )
  );

-- Policy 4: Users can delete products from their brand
CREATE POLICY "Users can delete products from their brand"
  ON products
  FOR DELETE
  USING (
    brand_id IN (
      SELECT brand_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND user_status = 'approved'
    )
  );

-- Policy 5: Super admins can view all products
CREATE POLICY "Super admins can view all products"
  ON products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Policy 6: Super admins can manage all products
CREATE POLICY "Super admins can manage all products"
  ON products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- ================================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at_trigger ON products;

CREATE TRIGGER products_updated_at_trigger
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- ================================================
-- 7. GRANT PERMISSIONS
-- ================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================






