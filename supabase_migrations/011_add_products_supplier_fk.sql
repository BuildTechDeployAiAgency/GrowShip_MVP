-- =====================================================
-- Migration 011: Add FK for products.supplier_id
-- =====================================================
-- Description: Ensure products.supplier_id references manufacturers.id
-- Date: 2025-11-05
-- Author: GrowShip Team
-- =====================================================

BEGIN;

-- Clean up any orphaned supplier references before enforcing the constraint
UPDATE products
SET supplier_id = NULL
WHERE supplier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM manufacturers m WHERE m.id = products.supplier_id
  );

-- Add foreign key constraint (nullable column → SET NULL on delete)
ALTER TABLE products
  ADD CONSTRAINT products_supplier_id_fkey
  FOREIGN KEY (supplier_id)
  REFERENCES manufacturers(id)
  ON DELETE SET NULL;

-- Helpful index for supplier → product lookups
CREATE INDEX IF NOT EXISTS idx_products_supplier_id
  ON products(supplier_id);

COMMENT ON CONSTRAINT products_supplier_id_fkey
  ON products IS 'Optional supplier reference that points to manufacturers.id';

COMMIT;

-- Verification
-- SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_name = 'products' AND constraint_name = 'products_supplier_id_fkey';
