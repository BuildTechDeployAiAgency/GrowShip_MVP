-- ================================================
-- MIGRATION 054: BACKFILL INVENTORY TRANSACTIONS
-- ================================================
-- Description: Create historical transactions for existing POs and Orders
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- WARNING: Run this script carefully in a test environment first!
-- ================================================

-- This script should be run manually, not automatically
-- Uncomment the BEGIN/COMMIT blocks when ready to execute

-- BEGIN;

DO $$
DECLARE
  v_po_record RECORD;
  v_order_record RECORD;
  v_line_record RECORD;
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_transaction_id UUID;
  v_po_count INTEGER := 0;
  v_order_count INTEGER := 0;
  v_transaction_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STARTING INVENTORY BACKFILL';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ================================================
  -- STEP 1: BACKUP CURRENT STOCK LEVELS
  -- ================================================
  RAISE NOTICE 'Step 1: Backing up current stock levels...';
  
  CREATE TEMP TABLE IF NOT EXISTS stock_backup AS
  SELECT id, sku, product_name, quantity_in_stock, allocated_stock, inbound_stock
  FROM products;
  
  RAISE NOTICE '✅ Backed up % products', (SELECT COUNT(*) FROM stock_backup);
  RAISE NOTICE '';

  -- ================================================
  -- STEP 2: RESET STOCK TO ZERO (FOR BACKFILL)
  -- ================================================
  RAISE NOTICE 'Step 2: Resetting stock levels to zero...';
  
  UPDATE products 
  SET quantity_in_stock = 0,
      allocated_stock = 0,
      inbound_stock = 0
  WHERE status = 'active';
  
  RAISE NOTICE '✅ Reset stock levels';
  RAISE NOTICE '';

  -- ================================================
  -- STEP 3: PROCESS RECEIVED PURCHASE ORDERS
  -- ================================================
  RAISE NOTICE 'Step 3: Processing received purchase orders...';
  
  FOR v_po_record IN (
    SELECT 
      id, 
      po_number, 
      brand_id, 
      po_status,
      approved_at,
      created_at
    FROM purchase_orders
    WHERE po_status = 'received'
    ORDER BY COALESCE(approved_at, created_at) ASC
  )
  LOOP
    -- Process each line of the PO
    FOR v_line_record IN (
      SELECT 
        pol.id,
        pol.product_id,
        pol.sku,
        pol.product_name,
        pol.quantity
      FROM purchase_order_lines pol
      WHERE pol.purchase_order_id = v_po_record.id
        AND pol.product_id IS NOT NULL
    )
    LOOP
      -- Get current stock level
      SELECT quantity_in_stock INTO v_stock_before
      FROM products
      WHERE id = v_line_record.product_id;

      v_stock_after := v_stock_before + v_line_record.quantity;

      -- Create PO_RECEIVED transaction
      INSERT INTO inventory_transactions (
        product_id,
        sku,
        product_name,
        transaction_type,
        transaction_date,
        source_type,
        source_id,
        reference_number,
        quantity_change,
        quantity_before,
        quantity_after,
        allocated_before,
        allocated_after,
        inbound_before,
        inbound_after,
        status,
        notes,
        brand_id,
        created_by,
        created_at
      ) VALUES (
        v_line_record.product_id,
        v_line_record.sku,
        v_line_record.product_name,
        'PO_RECEIVED',
        COALESCE(v_po_record.approved_at, v_po_record.created_at),
        'purchase_order',
        v_po_record.id,
        v_po_record.po_number,
        v_line_record.quantity,
        v_stock_before,
        v_stock_after,
        0, -- allocated_before
        0, -- allocated_after
        0, -- inbound_before
        0, -- inbound_after
        'completed',
        'Historical backfill - PO received',
        v_po_record.brand_id,
        NULL, -- System-generated
        COALESCE(v_po_record.approved_at, v_po_record.created_at)
      )
      ON CONFLICT DO NOTHING; -- Skip if already exists

      -- Update product stock
      UPDATE products
      SET quantity_in_stock = v_stock_after
      WHERE id = v_line_record.product_id;

      v_transaction_count := v_transaction_count + 1;
    END LOOP;

    v_po_count := v_po_count + 1;

    -- Log progress every 10 POs
    IF v_po_count % 10 = 0 THEN
      RAISE NOTICE '  Processed % POs...', v_po_count;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Processed % received purchase orders', v_po_count;
  RAISE NOTICE '✅ Created % PO transactions', v_transaction_count;
  RAISE NOTICE '';

  -- ================================================
  -- STEP 4: PROCESS FULFILLED ORDERS
  -- ================================================
  RAISE NOTICE 'Step 4: Processing fulfilled orders...';
  
  v_order_count := 0;
  v_transaction_count := 0;

  FOR v_order_record IN (
    SELECT 
      id,
      order_number,
      brand_id,
      order_status,
      actual_delivery_date,
      created_at
    FROM orders
    WHERE order_status IN ('shipped', 'delivered')  -- Only valid enum values for order_status
    ORDER BY COALESCE(actual_delivery_date, created_at) ASC
  )
  LOOP
    -- Process each line of the order
    FOR v_line_record IN (
      SELECT 
        ol.id,
        ol.product_id,
        ol.sku,
        ol.product_name,
        ol.quantity
      FROM order_lines ol
      WHERE ol.order_id = v_order_record.id
        AND ol.product_id IS NOT NULL
    )
    LOOP
      -- Get current stock level
      SELECT quantity_in_stock INTO v_stock_before
      FROM products
      WHERE id = v_line_record.product_id;

      v_stock_after := v_stock_before - v_line_record.quantity;

      -- Create ORDER_FULFILLED transaction
      INSERT INTO inventory_transactions (
        product_id,
        sku,
        product_name,
        transaction_type,
        transaction_date,
        source_type,
        source_id,
        reference_number,
        quantity_change,
        quantity_before,
        quantity_after,
        allocated_before,
        allocated_after,
        inbound_before,
        inbound_after,
        status,
        notes,
        brand_id,
        created_by,
        created_at
      ) VALUES (
        v_line_record.product_id,
        v_line_record.sku,
        v_line_record.product_name,
        'ORDER_FULFILLED',
        COALESCE(v_order_record.actual_delivery_date, v_order_record.created_at),
        'order',
        v_order_record.id,
        v_order_record.order_number,
        -v_line_record.quantity,
        v_stock_before,
        v_stock_after,
        0, -- allocated_before (historical - unknown)
        0, -- allocated_after
        0, -- inbound_before
        0, -- inbound_after
        'completed',
        'Historical backfill - Order fulfilled',
        v_order_record.brand_id,
        NULL, -- System-generated
        COALESCE(v_order_record.actual_delivery_date, v_order_record.created_at)
      )
      ON CONFLICT DO NOTHING; -- Skip if already exists

      -- Update product stock
      UPDATE products
      SET quantity_in_stock = v_stock_after
      WHERE id = v_line_record.product_id;

      v_transaction_count := v_transaction_count + 1;
    END LOOP;

    v_order_count := v_order_count + 1;

    -- Log progress every 10 orders
    IF v_order_count % 10 = 0 THEN
      RAISE NOTICE '  Processed % orders...', v_order_count;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Processed % fulfilled orders', v_order_count;
  RAISE NOTICE '✅ Created % order transactions', v_transaction_count;
  RAISE NOTICE '';

  -- ================================================
  -- STEP 5: RECONCILIATION
  -- ================================================
  RAISE NOTICE 'Step 5: Reconciling stock levels...';
  
  DECLARE
    v_product_record RECORD;
    v_backfilled_stock INTEGER;
    v_original_stock INTEGER;
    v_difference INTEGER;
    v_mismatch_count INTEGER := 0;
  BEGIN
    FOR v_product_record IN (
      SELECT 
        p.id,
        p.sku,
        p.product_name,
        p.quantity_in_stock as current_stock,
        sb.quantity_in_stock as original_stock
      FROM products p
      LEFT JOIN stock_backup sb ON p.id = sb.id
      WHERE sb.id IS NOT NULL
    )
    LOOP
      v_backfilled_stock := v_product_record.current_stock;
      v_original_stock := v_product_record.original_stock;
      v_difference := v_backfilled_stock - v_original_stock;

      IF v_difference != 0 THEN
        v_mismatch_count := v_mismatch_count + 1;

        RAISE NOTICE '  Mismatch for % (%): Backfilled=%, Original=%, Difference=%',
          v_product_record.sku,
          v_product_record.product_name,
          v_backfilled_stock,
          v_original_stock,
          v_difference;

        -- Create reconciliation adjustment
        INSERT INTO inventory_transactions (
          product_id,
          sku,
          product_name,
          transaction_type,
          transaction_date,
          source_type,
          source_id,
          reference_number,
          quantity_change,
          quantity_before,
          quantity_after,
          allocated_before,
          allocated_after,
          inbound_before,
          inbound_after,
          status,
          notes,
          brand_id,
          created_by
        ) VALUES (
          v_product_record.id,
          v_product_record.sku,
          v_product_record.product_name,
          'MANUAL_ADJUSTMENT',
          NOW(),
          'correction',
          NULL,
          'BACKFILL-RECONCILIATION',
          v_difference,
          v_backfilled_stock,
          v_original_stock,
          0,
          0,
          0,
          0,
          'completed',
          'Reconciliation adjustment after backfill to match original stock levels',
          (SELECT brand_id FROM products WHERE id = v_product_record.id),
          NULL
        );

        -- Update to original stock level
        UPDATE products
        SET quantity_in_stock = v_original_stock
        WHERE id = v_product_record.id;
      END IF;
    END LOOP;

    IF v_mismatch_count = 0 THEN
      RAISE NOTICE '✅ No mismatches found - all stock levels match!';
    ELSE
      RAISE NOTICE '⚠️  Found and corrected % mismatches', v_mismatch_count;
    END IF;
  END;

  RAISE NOTICE '';

  -- ================================================
  -- STEP 6: FINAL SUMMARY
  -- ================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKFILL COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Purchase Orders processed: %', v_po_count;
  RAISE NOTICE 'Orders processed: %', v_order_count;
  RAISE NOTICE 'Total transactions created: %', 
    (SELECT COUNT(*) FROM inventory_transactions WHERE notes LIKE '%Historical backfill%');
  RAISE NOTICE 'Products with transactions: %',
    (SELECT COUNT(DISTINCT product_id) FROM inventory_transactions);
  RAISE NOTICE '';
  RAISE NOTICE '✅ Backfill completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review transaction history in /inventory/transactions';
  RAISE NOTICE '2. Verify stock levels match expectations';
  RAISE NOTICE '3. Run validation script to confirm integrity';
  RAISE NOTICE '========================================';

END $$;

-- COMMIT;

-- ================================================
-- VALIDATION QUERIES (Run after backfill)
-- ================================================

-- Check transaction counts per product
-- SELECT 
--   p.sku,
--   p.product_name,
--   p.quantity_in_stock,
--   COUNT(it.id) as transaction_count,
--   SUM(CASE WHEN it.transaction_type LIKE 'PO_%' THEN 1 ELSE 0 END) as po_transactions,
--   SUM(CASE WHEN it.transaction_type LIKE 'ORDER_%' THEN 1 ELSE 0 END) as order_transactions
-- FROM products p
-- LEFT JOIN inventory_transactions it ON p.id = it.product_id
-- GROUP BY p.id, p.sku, p.product_name, p.quantity_in_stock
-- ORDER BY transaction_count DESC
-- LIMIT 20;

-- Check for products without transactions
-- SELECT 
--   p.id,
--   p.sku,
--   p.product_name,
--   p.quantity_in_stock
-- FROM products p
-- LEFT JOIN inventory_transactions it ON p.id = it.product_id
-- WHERE it.id IS NULL
--   AND p.status = 'active'
--   AND p.quantity_in_stock > 0;

-- Verify stock calculation matches transactions
-- SELECT 
--   p.sku,
--   p.product_name,
--   p.quantity_in_stock as current_stock,
--   COALESCE(SUM(it.quantity_change), 0) as calculated_stock,
--   p.quantity_in_stock - COALESCE(SUM(it.quantity_change), 0) as difference
-- FROM products p
-- LEFT JOIN inventory_transactions it ON p.id = it.product_id
-- GROUP BY p.id, p.sku, p.product_name, p.quantity_in_stock
-- HAVING p.quantity_in_stock != COALESCE(SUM(it.quantity_change), 0)
-- ORDER BY ABS(p.quantity_in_stock - COALESCE(SUM(it.quantity_change), 0)) DESC;

