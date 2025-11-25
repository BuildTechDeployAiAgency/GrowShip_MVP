-- ================================================
-- MIGRATION 052: ENHANCE PRODUCTS TABLE FOR INVENTORY TRACKING
-- ================================================
-- Description: Add inventory tracking fields and alert thresholds to products table
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ADD INVENTORY TRACKING FIELDS
-- ================================================

-- Add allocated_stock field (reserved for orders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'allocated_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN allocated_stock INTEGER DEFAULT 0 CHECK (allocated_stock >= 0);
    RAISE NOTICE '✅ Added allocated_stock column';
  ELSE
    RAISE NOTICE 'ℹ️  allocated_stock column already exists';
  END IF;
END $$;

-- Add inbound_stock field (expected from approved POs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'inbound_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN inbound_stock INTEGER DEFAULT 0 CHECK (inbound_stock >= 0);
    RAISE NOTICE '✅ Added inbound_stock column';
  ELSE
    RAISE NOTICE 'ℹ️  inbound_stock column already exists';
  END IF;
END $$;

-- Add available_stock computed field (on-hand minus allocated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'available_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN available_stock INTEGER GENERATED ALWAYS AS (quantity_in_stock - allocated_stock) STORED;
    RAISE NOTICE '✅ Added available_stock computed column';
  ELSE
    RAISE NOTICE 'ℹ️  available_stock column already exists';
  END IF;
END $$;

-- ================================================
-- 2. ADD ALERT THRESHOLD FIELDS
-- ================================================

-- Add low_stock_threshold (alert when stock falls below this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added low_stock_threshold column';
  ELSE
    RAISE NOTICE 'ℹ️  low_stock_threshold column already exists';
  END IF;
END $$;

-- Add critical_stock_threshold (urgent alert threshold)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'critical_stock_threshold'
  ) THEN
    ALTER TABLE products ADD COLUMN critical_stock_threshold INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added critical_stock_threshold column';
  ELSE
    RAISE NOTICE 'ℹ️  critical_stock_threshold column already exists';
  END IF;
END $$;

-- Add max_stock_threshold (overstock warning, optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'max_stock_threshold'
  ) THEN
    ALTER TABLE products ADD COLUMN max_stock_threshold INTEGER;
    RAISE NOTICE '✅ Added max_stock_threshold column';
  ELSE
    RAISE NOTICE 'ℹ️  max_stock_threshold column already exists';
  END IF;
END $$;

-- Add enable_stock_alerts flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'enable_stock_alerts'
  ) THEN
    ALTER TABLE products ADD COLUMN enable_stock_alerts BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added enable_stock_alerts column';
  ELSE
    RAISE NOTICE 'ℹ️  enable_stock_alerts column already exists';
  END IF;
END $$;

-- Add last_stock_check timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'last_stock_check'
  ) THEN
    ALTER TABLE products ADD COLUMN last_stock_check TIMESTAMPTZ;
    RAISE NOTICE '✅ Added last_stock_check column';
  ELSE
    RAISE NOTICE 'ℹ️  last_stock_check column already exists';
  END IF;
END $$;

-- ================================================
-- 3. CREATE INDEXES FOR NEW FIELDS
-- ================================================

CREATE INDEX IF NOT EXISTS idx_products_allocated_stock ON products(allocated_stock);
CREATE INDEX IF NOT EXISTS idx_products_inbound_stock ON products(inbound_stock);
CREATE INDEX IF NOT EXISTS idx_products_available_stock ON products(available_stock);
CREATE INDEX IF NOT EXISTS idx_products_low_stock_threshold ON products(low_stock_threshold);
CREATE INDEX IF NOT EXISTS idx_products_enable_stock_alerts ON products(enable_stock_alerts) WHERE enable_stock_alerts = true;

-- ================================================
-- 4. ADD COLUMN COMMENTS
-- ================================================

COMMENT ON COLUMN products.allocated_stock IS 'Stock reserved for orders (pending fulfillment)';
COMMENT ON COLUMN products.inbound_stock IS 'Expected stock from approved purchase orders';
COMMENT ON COLUMN products.available_stock IS 'Computed: quantity_in_stock - allocated_stock';
COMMENT ON COLUMN products.low_stock_threshold IS 'Alert when stock falls below this level';
COMMENT ON COLUMN products.critical_stock_threshold IS 'Urgent alert when stock falls below this level';
COMMENT ON COLUMN products.max_stock_threshold IS 'Optional overstock warning threshold';
COMMENT ON COLUMN products.enable_stock_alerts IS 'Whether to generate alerts for this product';
COMMENT ON COLUMN products.last_stock_check IS 'Last time stock levels were verified/checked';

-- ================================================
-- 5. SET DEFAULT THRESHOLDS BASED ON REORDER LEVELS
-- ================================================

-- For existing products, set low_stock_threshold to reorder_level if not already set
UPDATE products 
SET low_stock_threshold = COALESCE(reorder_level, 0),
    critical_stock_threshold = GREATEST(FLOOR(COALESCE(reorder_level, 0) * 0.5), 1)
WHERE low_stock_threshold = 0 
  AND reorder_level IS NOT NULL 
  AND reorder_level > 0;

COMMIT;

-- Verification
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_name = 'products' 
  AND column_name IN (
    'allocated_stock', 'inbound_stock', 'available_stock',
    'low_stock_threshold', 'critical_stock_threshold', 'max_stock_threshold',
    'enable_stock_alerts', 'last_stock_check'
  );
  
  IF col_count = 8 THEN
    RAISE NOTICE '✅ All 8 inventory tracking columns added successfully';
  ELSE
    RAISE WARNING '⚠️  Only % out of 8 columns were added', col_count;
  END IF;
END $$;

