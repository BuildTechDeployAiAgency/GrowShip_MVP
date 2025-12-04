-- ================================================
-- Migration: Sync Orders to Sales Data
-- ================================================
-- Description: Create mechanism to automatically sync confirmed/completed orders 
--              into sales_data table for dashboard metrics
-- Date: 2025-12-07
-- Author: GrowShip MVP Team
--
-- This migration:
-- 1. Adds order_id column to sales_data to link order-originated records
-- 2. Creates sync function to populate sales_data from order_lines
-- 3. Creates trigger to auto-sync on order status changes
-- 4. Backfills existing orders into sales_data
-- ================================================

BEGIN;

-- ================================================
-- 1. ADD ORDER_ID COLUMN TO SALES_DATA
-- ================================================
-- This establishes a link to prevent duplicates and manage updates

ALTER TABLE sales_data 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE sales_data 
ADD COLUMN IF NOT EXISTS order_line_id UUID;

-- Index for efficient lookups and duplicate prevention
CREATE INDEX IF NOT EXISTS idx_sales_data_order_id 
ON sales_data(order_id) 
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_data_order_line_id 
ON sales_data(order_line_id) 
WHERE order_line_id IS NOT NULL;

-- Unique constraint to prevent duplicate syncs for same order line
ALTER TABLE sales_data 
DROP CONSTRAINT IF EXISTS uq_sales_data_order_line_id;

ALTER TABLE sales_data 
ADD CONSTRAINT uq_sales_data_order_line_id UNIQUE (order_line_id);

COMMENT ON COLUMN sales_data.order_id IS 'Reference to orders table for order-originated sales records';
COMMENT ON COLUMN sales_data.order_line_id IS 'Reference to order_lines table for deduplication';


-- ================================================
-- 2. CREATE SYNC FUNCTION
-- ================================================
-- Function to sync a single order's line items to sales_data

CREATE OR REPLACE FUNCTION sync_order_to_sales_data(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_order RECORD;
  v_order_line RECORD;
  v_product RECORD;
  v_synced_count INTEGER := 0;
BEGIN
  -- Get order details
  SELECT 
    o.id,
    o.brand_id,
    o.distributor_id,
    o.user_id,
    o.order_date,
    o.customer_name,
    o.order_status,
    o.campaign_id,
    o.sales_channel,
    o.shipping_country,
    o.currency,
    o.notes
  INTO v_order
  FROM orders o
  WHERE o.id = p_order_id;

  -- If order not found, return 0
  IF v_order IS NULL THEN
    RETURN 0;
  END IF;

  -- Only sync orders with these statuses (processing, shipped, delivered)
  -- Note: 'pending' and 'cancelled' are excluded
  IF v_order.order_status NOT IN ('processing', 'shipped', 'delivered') THEN
    -- If order is cancelled or pending, remove any existing sales_data records
    DELETE FROM sales_data WHERE order_id = p_order_id;
    RETURN 0;
  END IF;

  -- Delete existing sales_data records for this order (to handle updates)
  DELETE FROM sales_data WHERE order_id = p_order_id;

  -- Insert new records from order_lines
  FOR v_order_line IN
    SELECT 
      ol.id AS line_id,
      ol.sku,
      ol.product_name,
      ol.product_id,
      ol.quantity,
      ol.unit_price,
      ol.total,
      ol.currency AS line_currency
    FROM order_lines ol
    WHERE ol.order_id = p_order_id
  LOOP
    -- Try to get product category from products table
    SELECT p.product_category INTO v_product
    FROM products p
    WHERE p.id = v_order_line.product_id
       OR p.sku = v_order_line.sku
    LIMIT 1;

    -- Insert into sales_data
    INSERT INTO sales_data (
      brand_id,
      distributor_id,
      user_id,
      order_id,
      order_line_id,
      sku,
      product_name,
      product_category,
      retailer_name,
      territory,
      territory_country,
      sales_date,
      reporting_month,
      sales_channel,
      total_sales,
      quantity_sold,
      currency,
      campaign_id,
      notes,
      import_timestamp
    ) VALUES (
      v_order.brand_id,
      v_order.distributor_id,
      v_order.user_id,
      v_order.id,
      v_order_line.line_id,
      v_order_line.sku,
      v_order_line.product_name,
      v_product.product_category,
      v_order.customer_name,
      NULL, -- territory (not available from orders)
      v_order.shipping_country,
      v_order.order_date,
      DATE_TRUNC('month', v_order.order_date)::DATE,
      v_order.sales_channel,
      v_order_line.total,
      v_order_line.quantity,
      COALESCE(v_order_line.line_currency, v_order.currency, 'USD'),
      v_order.campaign_id,
      v_order.notes,
      NOW()
    );

    v_synced_count := v_synced_count + 1;
  END LOOP;

  RETURN v_synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_order_to_sales_data IS 'Syncs order line items to sales_data for dashboard metrics';


-- ================================================
-- 3. CREATE TRIGGER FUNCTION
-- ================================================
-- Trigger function to automatically sync orders when status changes

CREATE OR REPLACE FUNCTION trigger_sync_order_to_sales_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status is in valid list or changed to cancelled/pending
  -- Valid statuses for sync: processing, shipped, delivered
  IF NEW.order_status IN ('processing', 'shipped', 'delivered') THEN
    -- Sync the order to sales_data
    PERFORM sync_order_to_sales_data(NEW.id);
  ELSIF NEW.order_status = 'cancelled' OR NEW.order_status = 'pending' THEN
    -- Remove from sales_data if cancelled or reverted to pending
    DELETE FROM sales_data WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_order_to_sales_data ON orders;

-- Create trigger on orders table
CREATE TRIGGER trigger_order_to_sales_data
  AFTER INSERT OR UPDATE OF order_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_order_to_sales_data();

COMMENT ON FUNCTION trigger_sync_order_to_sales_data IS 'Trigger function to auto-sync orders to sales_data on status change';


-- ================================================
-- 4. BACKFILL EXISTING ORDERS
-- ================================================
-- Process all existing orders with valid statuses

DO $$
DECLARE
  v_order_id UUID;
  v_total_synced INTEGER := 0;
  v_order_synced INTEGER;
BEGIN
  RAISE NOTICE 'Starting backfill of existing orders to sales_data...';

  FOR v_order_id IN
    SELECT id FROM orders 
    WHERE order_status IN ('processing', 'shipped', 'delivered')
    ORDER BY order_date DESC
  LOOP
    v_order_synced := sync_order_to_sales_data(v_order_id);
    v_total_synced := v_total_synced + v_order_synced;
  END LOOP;

  RAISE NOTICE 'Backfill complete. Total sales_data records created: %', v_total_synced;
END $$;


-- ================================================
-- 5. GRANT PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION sync_order_to_sales_data TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sync_order_to_sales_data TO authenticated;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately)
-- ================================================

-- Check if sales_data now has records
-- SELECT COUNT(*) AS total_records, SUM(total_sales) AS total_revenue FROM sales_data;

-- Check order-linked records
-- SELECT COUNT(*) AS order_linked_records FROM sales_data WHERE order_id IS NOT NULL;

-- Test the dashboard metrics function
-- SELECT * FROM get_sales_dashboard_metrics(p_year := 2025);

