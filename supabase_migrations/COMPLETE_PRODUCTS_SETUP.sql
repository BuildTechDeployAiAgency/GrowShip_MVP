-- ================================================
-- COMPLETE PRODUCTS SETUP - ALL IN ONE
-- ================================================
-- This script will:
-- 1. Create the products table
-- 2. Set up all RLS policies
-- 3. Create indexes and triggers
-- 4. Reload PostgREST cache
-- 5. Verify everything works
-- ================================================

-- ================================================
-- STEP 1: CREATE PRODUCT STATUS ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued', 'out_of_stock');
    RAISE NOTICE '✅ Created product_status enum';
  ELSE
    RAISE NOTICE '✅ product_status enum already exists';
  END IF;
END $$;

-- ================================================
-- STEP 2: CREATE PRODUCTS TABLE
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

-- Verify table was created
DO $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✅ Products table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create products table';
  END IF;
END $$;

-- ================================================
-- STEP 3: CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(product_category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

DO $$
BEGIN
  RAISE NOTICE '✅ Created 5 indexes for performance';
END $$;

-- ================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '✅ Row Level Security enabled';
END $$;

-- ================================================
-- STEP 5: CREATE RLS POLICIES
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

-- Verify policies
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'products';
  
  RAISE NOTICE '✅ Created % RLS policies', policy_count;
END $$;

-- ================================================
-- STEP 6: CREATE TRIGGER FOR UPDATED_AT
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

DO $$
BEGIN
  RAISE NOTICE '✅ Created auto-timestamp trigger';
END $$;

-- ================================================
-- STEP 7: GRANT PERMISSIONS
-- ================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ Granted permissions to authenticated users';
END $$;

-- ================================================
-- STEP 8: RELOAD POSTGREST CACHE
-- ================================================

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '✅ PostgREST cache reload triggered';
END $$;

-- ================================================
-- STEP 9: FINAL VERIFICATION
-- ================================================

DO $$
DECLARE
  table_exists boolean;
  column_count integer;
  policy_count integer;
  index_count integer;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION '❌ VERIFICATION FAILED: Table does not exist';
  END IF;
  
  -- Count columns
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'products';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'products';
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'products';
  
  -- Display summary
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 PRODUCTS TABLE SETUP COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table created: products';
  RAISE NOTICE '✅ Columns: % fields', column_count;
  RAISE NOTICE '✅ RLS Policies: %', policy_count;
  RAISE NOTICE '✅ Indexes: %', index_count;
  RAISE NOTICE '✅ Triggers: Auto-timestamp enabled';
  RAISE NOTICE '✅ Permissions: Granted to authenticated';
  RAISE NOTICE '✅ PostgREST: Cache reload triggered';
  RAISE NOTICE '';
  RAISE NOTICE '⏱️  WAIT 15 SECONDS for cache to refresh';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Then verify with:';
  RAISE NOTICE '   node scripts/diagnose-products-table.js';
  RAISE NOTICE '';
  RAISE NOTICE '🌐 Or navigate to:';
  RAISE NOTICE '   http://localhost:3000/products';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
END $$;

