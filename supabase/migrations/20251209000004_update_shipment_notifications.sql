-- ============================================================================
-- Migration: Update Shipment Functions to Use Role-Based Notifications
-- Date: 2025-12-09
-- Description: Modifies create_shipment_transaction and update_shipment_status
--              to use the create_shipment_notification helper function instead
--              of hardcoded notification INSERT statements.
-- ============================================================================

-- ================================================
-- 1. UPDATE create_shipment_transaction FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION create_shipment_transaction(
  p_order_id UUID,
  p_items JSONB,
  p_carrier VARCHAR DEFAULT NULL,
  p_tracking_number VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_expected_delivery_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_shipment_id UUID;
  v_shipment_number VARCHAR;
  v_item JSONB;
  v_order_line RECORD;
  v_product RECORD;
  v_ship_quantity INTEGER;
  v_total_items INTEGER := 0;
  v_total_value NUMERIC(12,2) := 0;
  v_all_fulfilled BOOLEAN;
  v_any_shipped BOOLEAN;
  v_result JSONB;
  v_notifications_created INTEGER;
BEGIN
  -- 1. Validate order exists and get details
  SELECT o.*, d.company_name as distributor_name
  INTO v_order
  FROM orders o
  LEFT JOIN distributors d ON d.id = o.distributor_id
  WHERE o.id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- 2. Validate order status allows shipping
  IF v_order.order_status NOT IN ('pending', 'confirmed', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order status does not allow shipping: ' || v_order.order_status);
  END IF;
  
  -- 3. Generate shipment number
  v_shipment_number := 'SHP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                       LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- 4. Create shipment record
  INSERT INTO shipments (
    order_id,
    brand_id,
    shipment_number,
    carrier,
    tracking_number,
    shipment_status,
    expected_delivery_date,
    notes,
    created_by,
    updated_by
  ) VALUES (
    p_order_id,
    v_order.brand_id,
    v_shipment_number,
    p_carrier,
    p_tracking_number,
    'pending',
    p_expected_delivery_date,
    p_notes,
    p_user_id,
    p_user_id
  ) RETURNING id INTO v_shipment_id;
  
  -- 5. Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_ship_quantity := (v_item->>'quantity')::INTEGER;
    
    -- Get order line
    SELECT * INTO v_order_line
    FROM order_lines
    WHERE id = (v_item->>'order_line_id')::UUID
      AND order_id = p_order_id;
    
    IF v_order_line IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Get product for value calculation
    SELECT * INTO v_product
    FROM products
    WHERE id = v_order_line.product_id;
    
    -- Create shipment item
    INSERT INTO shipment_items (
      shipment_id,
      order_line_id,
      product_id,
      sku,
      product_name,
      quantity_shipped,
      unit_price
    ) VALUES (
      v_shipment_id,
      v_order_line.id,
      v_order_line.product_id,
      v_order_line.sku,
      v_order_line.product_name,
      v_ship_quantity,
      v_order_line.unit_price
    );
    
    -- Update order line shipped quantity
    UPDATE order_lines
    SET shipped_quantity = COALESCE(shipped_quantity, 0) + v_ship_quantity,
        updated_at = NOW()
    WHERE id = v_order_line.id;
    
    -- Update totals
    v_total_items := v_total_items + v_ship_quantity;
    v_total_value := v_total_value + (v_ship_quantity * v_order_line.unit_price);
    
    -- Update product allocated and quantity
    IF v_product IS NOT NULL THEN
      UPDATE products
      SET allocated_stock = GREATEST(0, COALESCE(allocated_stock, 0) - v_ship_quantity),
          quantity_in_stock = GREATEST(0, COALESCE(quantity_in_stock, 0) - v_ship_quantity),
          updated_at = NOW()
      WHERE id = v_order_line.product_id;
      
      -- Create inventory transaction
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
        status,
        notes,
        brand_id,
        created_by
      ) VALUES (
        v_order_line.product_id,
        v_order_line.sku,
        v_order_line.product_name,
        'SHIPMENT',
        NOW(),
        'shipment',
        v_shipment_id,
        v_shipment_number,
        -v_ship_quantity,
        v_product.quantity_in_stock,
        GREATEST(0, v_product.quantity_in_stock - v_ship_quantity),
        v_product.allocated_stock,
        GREATEST(0, COALESCE(v_product.allocated_stock, 0) - v_ship_quantity),
        'completed',
        'Shipped in ' || v_shipment_number,
        v_order.brand_id,
        p_user_id
      );
    END IF;
  END LOOP;
  
  -- 6. Update shipment totals
  UPDATE shipments
  SET total_items_shipped = v_total_items,
      total_value = v_total_value
  WHERE id = v_shipment_id;
  
  -- 7. Calculate and update order fulfilment status
  SELECT 
    BOOL_AND(COALESCE(shipped_quantity, 0) >= quantity) AS all_fulfilled,
    BOOL_OR(COALESCE(shipped_quantity, 0) > 0) AS any_shipped
  INTO v_all_fulfilled, v_any_shipped
  FROM order_lines
  WHERE order_id = p_order_id;
  
  UPDATE orders
  SET fulfilment_status = CASE
    WHEN v_all_fulfilled THEN 'fulfilled'
    WHEN v_any_shipped THEN 'partial'
    ELSE 'pending'
  END,
  updated_at = NOW(),
  updated_by = p_user_id
  WHERE id = p_order_id;
  
  -- 8. Create role-based notification using helper function
  -- This replaces the hardcoded INSERT INTO notifications
  BEGIN
    v_notifications_created := create_shipment_notification(
      v_shipment_id,
      v_shipment_number,
      v_order.order_number,
      v_order.brand_id,
      v_order.distributor_id,
      'pending', -- Initial status
      '/orders/' || p_order_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail the transaction if notifications fail
    RAISE WARNING 'Failed to create shipment notification: %', SQLERRM;
    v_notifications_created := 0;
  END;
  
  -- 9. Return success with shipment details
  SELECT jsonb_build_object(
    'success', true,
    'shipment_id', v_shipment_id,
    'shipment_number', v_shipment_number,
    'total_items', v_total_items,
    'total_value', v_total_value,
    'notifications_created', v_notifications_created,
    'fulfilment_status', CASE
      WHEN v_all_fulfilled THEN 'fulfilled'
      WHEN v_any_shipped THEN 'partial'
      ELSE 'pending'
    END
  ) INTO v_result;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ================================================
-- 2. UPDATE update_shipment_status FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION update_shipment_status(
  p_shipment_id UUID,
  p_new_status VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shipment RECORD;
  v_order RECORD;
  v_current_status VARCHAR;
  v_valid_transition BOOLEAN := FALSE;
  v_result JSONB;
  v_notifications_created INTEGER;
BEGIN
  -- 1. Get current shipment with order details
  SELECT s.*, o.order_number, o.distributor_id
  INTO v_shipment
  FROM shipments s
  JOIN orders o ON o.id = s.order_id
  WHERE s.id = p_shipment_id;
  
  IF v_shipment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shipment not found');
  END IF;
  
  -- 2. Get current status
  v_current_status := v_shipment.shipment_status::TEXT;
  
  -- 3. Validate status transition
  CASE v_current_status
    WHEN 'pending' THEN
      v_valid_transition := p_new_status IN ('processing', 'in_transit', 'shipped', 'cancelled');
    WHEN 'processing' THEN
      v_valid_transition := p_new_status IN ('in_transit', 'shipped', 'cancelled');
    WHEN 'in_transit' THEN
      v_valid_transition := p_new_status IN ('out_for_delivery', 'delivered', 'failed');
    WHEN 'out_for_delivery' THEN
      v_valid_transition := p_new_status IN ('delivered', 'failed');
    WHEN 'shipped' THEN
      v_valid_transition := p_new_status IN ('in_transit', 'delivered', 'failed');
    WHEN 'delivered' THEN
      v_valid_transition := FALSE; -- Terminal state
    WHEN 'failed' THEN
      v_valid_transition := p_new_status IN ('pending'); -- Can retry
    WHEN 'returned' THEN
      v_valid_transition := FALSE; -- Terminal state
    WHEN 'cancelled' THEN
      v_valid_transition := FALSE; -- Terminal state
    ELSE
      v_valid_transition := TRUE; -- Allow for unknown states
  END CASE;
  
  IF NOT v_valid_transition THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid status transition from ' || v_current_status || ' to ' || p_new_status
    );
  END IF;
  
  -- 4. Update shipment status
  UPDATE shipments
  SET shipment_status = p_new_status::shipment_status,
      shipped_date = CASE WHEN p_new_status IN ('shipped', 'in_transit') THEN COALESCE(shipped_date, NOW()) ELSE shipped_date END,
      actual_delivery_date = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE actual_delivery_date END,
      notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes, '') || E'\n' || p_notes ELSE notes END,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_shipment_id;
  
  -- 5. Create role-based notification using helper function
  -- This replaces the hardcoded INSERT INTO notifications
  BEGIN
    v_notifications_created := create_shipment_notification(
      p_shipment_id,
      v_shipment.shipment_number,
      v_shipment.order_number,
      v_shipment.brand_id,
      v_shipment.distributor_id,
      p_new_status,
      '/orders/' || v_shipment.order_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail the transaction if notifications fail
    RAISE WARNING 'Failed to create shipment status notification: %', SQLERRM;
    v_notifications_created := 0;
  END;
  
  -- 6. Return success
  RETURN jsonb_build_object(
    'success', true,
    'shipment_id', p_shipment_id,
    'previous_status', v_current_status,
    'new_status', p_new_status,
    'notifications_created', v_notifications_created
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ================================================
-- 3. ADD COMMENTS
-- ================================================

COMMENT ON FUNCTION create_shipment_transaction IS 
  'Creates a shipment with items, updates inventory, and triggers role-based notifications.
   Notifications are configured via notification_role_settings table.';

COMMENT ON FUNCTION update_shipment_status IS 
  'Updates shipment status with validation and role-based notifications.
   Notifications are configured via notification_role_settings table.';

-- ================================================
-- 4. VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Shipment Functions Updated';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions updated to use role-based notifications:';
  RAISE NOTICE '  - create_shipment_transaction';
  RAISE NOTICE '  - update_shipment_status';
  RAISE NOTICE '';
  RAISE NOTICE 'Notifications now controlled by:';
  RAISE NOTICE '  - notification_types (registry)';
  RAISE NOTICE '  - notification_role_settings (per-role config)';
  RAISE NOTICE '========================================';
END $$;
