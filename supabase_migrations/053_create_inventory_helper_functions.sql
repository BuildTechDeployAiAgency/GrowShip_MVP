-- ================================================
-- MIGRATION 053: CREATE INVENTORY HELPER FUNCTIONS
-- ================================================
-- Description: Create helper functions for inventory operations
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. FUNCTION: GET STOCK BREAKDOWN
-- ================================================

CREATE OR REPLACE FUNCTION get_stock_breakdown(p_product_id UUID)
RETURNS TABLE (
  product_id UUID,
  sku VARCHAR,
  product_name VARCHAR,
  on_hand INTEGER,
  allocated INTEGER,
  available INTEGER,
  inbound INTEGER,
  low_stock_threshold INTEGER,
  critical_stock_threshold INTEGER,
  enable_stock_alerts BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.sku,
    p.product_name,
    p.quantity_in_stock as on_hand,
    p.allocated_stock as allocated,
    p.available_stock as available,
    p.inbound_stock as inbound,
    p.low_stock_threshold,
    p.critical_stock_threshold,
    p.enable_stock_alerts
  FROM products p
  WHERE p.id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 2. FUNCTION: GET TRANSACTION HISTORY
-- ================================================

CREATE OR REPLACE FUNCTION get_transaction_history(
  p_product_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  sku VARCHAR,
  product_name VARCHAR,
  transaction_type VARCHAR,
  transaction_date TIMESTAMPTZ,
  source_type VARCHAR,
  source_id UUID,
  reference_number VARCHAR,
  quantity_change NUMERIC,
  quantity_before NUMERIC,
  quantity_after NUMERIC,
  allocated_before NUMERIC,
  allocated_after NUMERIC,
  inbound_before NUMERIC,
  inbound_after NUMERIC,
  status VARCHAR,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    it.id,
    it.product_id,
    it.sku,
    it.product_name,
    it.transaction_type,
    it.transaction_date,
    it.source_type,
    it.source_id,
    it.reference_number,
    it.quantity_change,
    it.quantity_before,
    it.quantity_after,
    it.allocated_before,
    it.allocated_after,
    it.inbound_before,
    it.inbound_after,
    it.status,
    it.notes,
    it.created_by,
    it.created_at
  FROM inventory_transactions it
  WHERE it.product_id = p_product_id
    AND (p_date_from IS NULL OR it.transaction_date >= p_date_from)
    AND (p_date_to IS NULL OR it.transaction_date <= p_date_to)
  ORDER BY it.transaction_date DESC, it.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 3. FUNCTION: CHECK STOCK THRESHOLDS
-- ================================================

CREATE OR REPLACE FUNCTION check_stock_thresholds(p_brand_id UUID)
RETURNS TABLE (
  product_id UUID,
  sku VARCHAR,
  product_name VARCHAR,
  current_stock INTEGER,
  available_stock INTEGER,
  threshold_type VARCHAR,
  threshold_value INTEGER,
  shortfall INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.sku,
    p.product_name,
    p.quantity_in_stock as current_stock,
    p.available_stock,
    CASE 
      WHEN p.quantity_in_stock = 0 THEN 'out_of_stock'
      WHEN p.quantity_in_stock <= p.critical_stock_threshold THEN 'critical'
      WHEN p.quantity_in_stock <= p.low_stock_threshold THEN 'low'
      WHEN p.max_stock_threshold IS NOT NULL AND p.quantity_in_stock >= p.max_stock_threshold THEN 'overstock'
      ELSE 'healthy'
    END as threshold_type,
    CASE 
      WHEN p.quantity_in_stock = 0 THEN 0
      WHEN p.quantity_in_stock <= p.critical_stock_threshold THEN p.critical_stock_threshold
      WHEN p.quantity_in_stock <= p.low_stock_threshold THEN p.low_stock_threshold
      WHEN p.max_stock_threshold IS NOT NULL AND p.quantity_in_stock >= p.max_stock_threshold THEN p.max_stock_threshold
      ELSE 0
    END as threshold_value,
    CASE 
      WHEN p.quantity_in_stock <= p.critical_stock_threshold THEN p.critical_stock_threshold - p.quantity_in_stock
      WHEN p.quantity_in_stock <= p.low_stock_threshold THEN p.low_stock_threshold - p.quantity_in_stock
      ELSE 0
    END as shortfall
  FROM products p
  WHERE p.brand_id = p_brand_id
    AND p.status = 'active'
    AND p.enable_stock_alerts = true
    AND (
      p.quantity_in_stock = 0
      OR p.quantity_in_stock <= p.critical_stock_threshold
      OR p.quantity_in_stock <= p.low_stock_threshold
      OR (p.max_stock_threshold IS NOT NULL AND p.quantity_in_stock >= p.max_stock_threshold)
    )
  ORDER BY 
    CASE 
      WHEN p.quantity_in_stock = 0 THEN 1
      WHEN p.quantity_in_stock <= p.critical_stock_threshold THEN 2
      WHEN p.quantity_in_stock <= p.low_stock_threshold THEN 3
      ELSE 4
    END,
    p.quantity_in_stock ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 4. FUNCTION: CREATE INVENTORY TRANSACTION
-- ================================================

CREATE OR REPLACE FUNCTION create_inventory_transaction(
  p_product_id UUID,
  p_sku VARCHAR,
  p_product_name VARCHAR,
  p_transaction_type VARCHAR,
  p_quantity_change NUMERIC,
  p_source_type VARCHAR DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_reference_number VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_brand_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_allow_negative BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_product RECORD;
  v_new_quantity_in_stock NUMERIC;
  v_brand_id UUID;
BEGIN
  -- Get current product state
  SELECT 
    id,
    brand_id,
    quantity_in_stock,
    allocated_stock,
    inbound_stock
  INTO v_current_product
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  -- Use product's brand_id if not provided
  v_brand_id := COALESCE(p_brand_id, v_current_product.brand_id);

  -- Calculate new quantity
  v_new_quantity_in_stock := v_current_product.quantity_in_stock + p_quantity_change;

  -- Check for negative stock if not allowed
  IF NOT p_allow_negative AND v_new_quantity_in_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', 
      v_current_product.quantity_in_stock, ABS(p_quantity_change);
  END IF;

  -- Insert transaction record
  INSERT INTO inventory_transactions (
    product_id,
    sku,
    product_name,
    transaction_type,
    quantity_change,
    quantity_before,
    quantity_after,
    allocated_before,
    allocated_after,
    inbound_before,
    inbound_after,
    source_type,
    source_id,
    reference_number,
    notes,
    brand_id,
    created_by,
    status
  ) VALUES (
    p_product_id,
    p_sku,
    p_product_name,
    p_transaction_type,
    p_quantity_change,
    v_current_product.quantity_in_stock,
    v_new_quantity_in_stock,
    v_current_product.allocated_stock,
    v_current_product.allocated_stock, -- Will be updated separately if needed
    v_current_product.inbound_stock,
    v_current_product.inbound_stock, -- Will be updated separately if needed
    p_source_type,
    p_source_id,
    p_reference_number,
    p_notes,
    v_brand_id,
    p_created_by,
    'completed'
  )
  RETURNING id INTO v_transaction_id;

  -- Update product quantity_in_stock
  UPDATE products
  SET 
    quantity_in_stock = v_new_quantity_in_stock,
    updated_at = NOW()
  WHERE id = p_product_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. FUNCTION: UPDATE ALLOCATED STOCK
-- ================================================

CREATE OR REPLACE FUNCTION update_allocated_stock(
  p_product_id UUID,
  p_allocated_change INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_current_allocated INTEGER;
  v_new_allocated INTEGER;
BEGIN
  -- Get current allocated stock
  SELECT allocated_stock INTO v_current_allocated
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  v_new_allocated := v_current_allocated + p_allocated_change;

  IF v_new_allocated < 0 THEN
    RAISE EXCEPTION 'Cannot have negative allocated stock. Current: %, Change: %', 
      v_current_allocated, p_allocated_change;
  END IF;

  -- Update allocated stock
  UPDATE products
  SET 
    allocated_stock = v_new_allocated,
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 6. FUNCTION: UPDATE INBOUND STOCK
-- ================================================

CREATE OR REPLACE FUNCTION update_inbound_stock(
  p_product_id UUID,
  p_inbound_change INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_current_inbound INTEGER;
  v_new_inbound INTEGER;
BEGIN
  -- Get current inbound stock
  SELECT inbound_stock INTO v_current_inbound
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  v_new_inbound := v_current_inbound + p_inbound_change;

  IF v_new_inbound < 0 THEN
    RAISE EXCEPTION 'Cannot have negative inbound stock. Current: %, Change: %', 
      v_current_inbound, p_inbound_change;
  END IF;

  -- Update inbound stock
  UPDATE products
  SET 
    inbound_stock = v_new_inbound,
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 7. FUNCTION: GET INVENTORY SUMMARY WITH ALERTS
-- ================================================

CREATE OR REPLACE FUNCTION get_inventory_summary_with_alerts(p_brand_id UUID)
RETURNS TABLE (
  total_products BIGINT,
  total_value NUMERIC,
  total_on_hand INTEGER,
  total_allocated INTEGER,
  total_available INTEGER,
  total_inbound INTEGER,
  low_stock_count BIGINT,
  critical_stock_count BIGINT,
  out_of_stock_count BIGINT,
  overstock_count BIGINT,
  healthy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_products,
    COALESCE(SUM(p.quantity_in_stock * p.unit_price), 0) as total_value,
    COALESCE(SUM(p.quantity_in_stock), 0)::INTEGER as total_on_hand,
    COALESCE(SUM(p.allocated_stock), 0)::INTEGER as total_allocated,
    COALESCE(SUM(p.available_stock), 0)::INTEGER as total_available,
    COALESCE(SUM(p.inbound_stock), 0)::INTEGER as total_inbound,
    COUNT(*) FILTER (
      WHERE p.quantity_in_stock > p.critical_stock_threshold 
      AND p.quantity_in_stock <= p.low_stock_threshold
      AND p.enable_stock_alerts = true
    )::BIGINT as low_stock_count,
    COUNT(*) FILTER (
      WHERE p.quantity_in_stock > 0 
      AND p.quantity_in_stock <= p.critical_stock_threshold
      AND p.enable_stock_alerts = true
    )::BIGINT as critical_stock_count,
    COUNT(*) FILTER (WHERE p.quantity_in_stock = 0)::BIGINT as out_of_stock_count,
    COUNT(*) FILTER (
      WHERE p.max_stock_threshold IS NOT NULL 
      AND p.quantity_in_stock >= p.max_stock_threshold
      AND p.enable_stock_alerts = true
    )::BIGINT as overstock_count,
    COUNT(*) FILTER (
      WHERE p.quantity_in_stock > p.low_stock_threshold
      AND (p.max_stock_threshold IS NULL OR p.quantity_in_stock < p.max_stock_threshold)
    )::BIGINT as healthy_count
  FROM products p
  WHERE p.brand_id = p_brand_id
    AND p.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Inventory helper functions created successfully';
  RAISE NOTICE '   - get_stock_breakdown(product_id)';
  RAISE NOTICE '   - get_transaction_history(product_id, date_from, date_to, limit)';
  RAISE NOTICE '   - check_stock_thresholds(brand_id)';
  RAISE NOTICE '   - create_inventory_transaction(...)';
  RAISE NOTICE '   - update_allocated_stock(product_id, change)';
  RAISE NOTICE '   - update_inbound_stock(product_id, change)';
  RAISE NOTICE '   - get_inventory_summary_with_alerts(brand_id)';
END $$;

