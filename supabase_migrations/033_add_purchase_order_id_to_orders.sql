-- ================================================
-- MIGRATION 033: ADD PURCHASE_ORDER_ID TO ORDERS
-- ================================================
-- Description: Add foreign key relationship from orders to purchase_orders
-- Date: November 18, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. ADD PURCHASE_ORDER_ID COLUMN TO ORDERS
-- ================================================

-- Add the column (nullable to support legacy/manual orders without PO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'purchase_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN purchase_order_id UUID;
  END IF;
END $$;

-- ================================================
-- 2. ADD FOREIGN KEY CONSTRAINT
-- ================================================

-- Add foreign key constraint (ON DELETE SET NULL to preserve order history)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_purchase_order_id_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders 
      ADD CONSTRAINT orders_purchase_order_id_fkey 
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================
-- 3. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_orders_purchase_order_id ON orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_po_brand_distributor ON orders(purchase_order_id, brand_id, distributor_id);
CREATE INDEX IF NOT EXISTS idx_orders_po_date ON orders(purchase_order_id, order_date);

-- ================================================
-- 4. ADD VALIDATION FUNCTION
-- ================================================

-- Function to validate that order's brand/distributor matches the PO
CREATE OR REPLACE FUNCTION validate_order_purchase_order()
RETURNS TRIGGER AS $$
DECLARE
  po_brand_id UUID;
  po_distributor_id UUID;
  po_status TEXT;
BEGIN
  -- Only validate if purchase_order_id is set
  IF NEW.purchase_order_id IS NOT NULL THEN
    -- Get PO details
    SELECT brand_id, distributor_id, po_status
    INTO po_brand_id, po_distributor_id, po_status
    FROM purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    -- Check if PO exists
    IF po_brand_id IS NULL THEN
      RAISE EXCEPTION 'Purchase order not found: %', NEW.purchase_order_id;
    END IF;
    
    -- Validate brand matches
    IF NEW.brand_id != po_brand_id THEN
      RAISE EXCEPTION 'Order brand_id (%) does not match purchase order brand_id (%)', 
        NEW.brand_id, po_brand_id;
    END IF;
    
    -- Validate distributor matches (if PO has distributor)
    IF po_distributor_id IS NOT NULL AND NEW.distributor_id != po_distributor_id THEN
      RAISE EXCEPTION 'Order distributor_id (%) does not match purchase order distributor_id (%)', 
        NEW.distributor_id, po_distributor_id;
    END IF;
    
    -- Optionally validate PO status (commented out for flexibility, can enable later)
    -- IF po_status NOT IN ('approved', 'ordered', 'received') THEN
    --   RAISE EXCEPTION 'Purchase order must be approved before creating orders. Current status: %', po_status;
    -- END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. CREATE TRIGGER
-- ================================================

DROP TRIGGER IF EXISTS validate_order_purchase_order_trigger ON orders;
CREATE TRIGGER validate_order_purchase_order_trigger
  BEFORE INSERT OR UPDATE OF purchase_order_id, brand_id, distributor_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_purchase_order();

-- ================================================
-- 6. ADD COMMENTS
-- ================================================

COMMENT ON COLUMN orders.purchase_order_id IS 'Foreign key to purchase_orders table. Nullable to support legacy/manual orders without PO.';

COMMIT;

-- Verification queries (run separately)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'purchase_order_id';
-- SELECT * FROM orders WHERE purchase_order_id IS NOT NULL LIMIT 5;

