-- ================================================
-- Migration 064: Fix shipment notification type in RPC functions
-- ================================================
-- Description: Change 'shipping' to 'shipment' in create_shipment_transaction
--              and update_shipment_status functions. The notification_type enum
--              has 'shipment' as a valid value, not 'shipping'.
-- Date: 2025-12-03
-- Author: GrowShip Team
-- ================================================

BEGIN;

-- ================================================
-- 1. RECREATE create_shipment_transaction FUNCTION
-- Fix: Use 'shipment' instead of 'shipping' for notification_type
-- ================================================

CREATE OR REPLACE FUNCTION create_shipment_transaction(
  p_order_id UUID,
  p_carrier VARCHAR DEFAULT NULL,
  p_tracking_number VARCHAR DEFAULT NULL,
  p_shipping_method VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_po_id UUID;
  v_po_status VARCHAR;
  v_shipment_id UUID;
  v_shipment_number VARCHAR;
  v_item RECORD;
  v_order_line RECORD;
  v_product RECORD;
  v_total_items INTEGER := 0;
  v_total_value NUMERIC := 0;
  v_all_fulfilled BOOLEAN := TRUE;
  v_any_shipped BOOLEAN := FALSE;
  v_result JSONB;
  v_user_role TEXT;
  v_cost_price NUMERIC := 0;
BEGIN
  -- 0. Check caller authorization
  IF p_user_id IS NOT NULL THEN
    SELECT role_name INTO v_user_role
    FROM user_profiles
    WHERE user_id = p_user_id
      AND user_status = 'approved';

    IF v_user_role IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'User not found or not approved');
    END IF;

    IF v_user_role NOT IN ('super_admin', 'brand_admin', 'brand_manager', 'brand_logistics') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to create shipments');
    END IF;
  END IF;

  -- 1. Validate order exists and get details
  SELECT 
    id,
    order_number,
    brand_id,
    distributor_id,
    purchase_order_id,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_zip_code,
    shipping_country
  INTO v_order
  FROM orders 
  WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- 2. Get PO ID from order
  v_po_id := v_order.purchase_order_id;
  
  -- 3. Validate PO is approved if linked
  IF v_po_id IS NOT NULL THEN
    SELECT po_status::TEXT INTO v_po_status FROM purchase_orders WHERE id = v_po_id;
    IF v_po_status IS NOT NULL AND v_po_status != 'approved' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Associated Purchase Order must be approved');
    END IF;
  END IF;
  
  -- 4. Validate items array is not empty
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No items provided for shipment');
  END IF;
  
  -- 5. Generate shipment number
  v_shipment_number := 'SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- 6. Create shipment header (using existing column names: po_id, shipment_status)
  INSERT INTO shipments (
    shipment_number,
    order_id,
    po_id,
    distributor_id,
    brand_id,
    shipment_status,
    carrier,
    tracking_number,
    shipping_method,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_zip_code,
    shipping_country,
    notes,
    created_by,
    updated_by,
    user_id
  ) VALUES (
    v_shipment_number,
    p_order_id,
    v_po_id,
    v_order.distributor_id,
    v_order.brand_id,
    'pending',
    p_carrier,
    p_tracking_number,
    p_shipping_method,
    v_order.shipping_address_line1,
    v_order.shipping_address_line2,
    v_order.shipping_city,
    v_order.shipping_state,
    v_order.shipping_zip_code,
    v_order.shipping_country,
    p_notes,
    p_user_id,
    p_user_id,
    p_user_id
  )
  RETURNING id INTO v_shipment_id;
  
  -- 7. Process each item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    order_line_id UUID,
    product_id UUID,
    sku VARCHAR,
    product_name VARCHAR,
    quantity_to_ship NUMERIC,
    unit_price NUMERIC
  )
  LOOP
    -- Reset cost_price for each item
    v_cost_price := 0;
    
    -- Get order line details
    SELECT * INTO v_order_line
    FROM order_lines
    WHERE id = v_item.order_line_id AND order_id = p_order_id;
    
    IF v_order_line IS NULL THEN
      RAISE EXCEPTION 'Order line % not found for order %', v_item.order_line_id, p_order_id;
    END IF;
    
    -- Validate quantity doesn't exceed remaining
    IF v_item.quantity_to_ship > (v_order_line.quantity - COALESCE(v_order_line.shipped_quantity, 0)) THEN
      RAISE EXCEPTION 'Quantity to ship (%) exceeds remaining quantity (%) for SKU %', 
        v_item.quantity_to_ship, 
        (v_order_line.quantity - COALESCE(v_order_line.shipped_quantity, 0)),
        v_order_line.sku;
    END IF;
    
    -- Get product for inventory check (if product_id is provided)
    IF v_item.product_id IS NOT NULL THEN
      SELECT * INTO v_product
      FROM products
      WHERE id = v_item.product_id;
      
      IF v_product IS NOT NULL THEN
        -- Store cost_price for later use
        v_cost_price := COALESCE(v_product.cost_price, 0);
        
        -- Check available stock (quantity_in_stock - allocated_stock)
        IF COALESCE(v_product.available_stock, v_product.quantity_in_stock) < v_item.quantity_to_ship THEN
          RAISE EXCEPTION 'Insufficient inventory for SKU %. Available: %, Requested: %',
            v_order_line.sku,
            COALESCE(v_product.available_stock, v_product.quantity_in_stock),
            v_item.quantity_to_ship;
        END IF;
        
        -- Decrement inventory
        UPDATE products
        SET quantity_in_stock = quantity_in_stock - v_item.quantity_to_ship,
            allocated_stock = GREATEST(0, COALESCE(allocated_stock, 0) - v_item.quantity_to_ship),
            updated_at = NOW()
        WHERE id = v_item.product_id;
        
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
          inbound_before,
          inbound_after,
          status,
          notes,
          brand_id,
          created_by
        ) VALUES (
          v_item.product_id,
          v_order_line.sku,
          v_order_line.product_name,
          'SHIPMENT',
          NOW(),
          'shipment',
          v_shipment_id,
          v_shipment_number,
          -v_item.quantity_to_ship,
          v_product.quantity_in_stock,
          v_product.quantity_in_stock - v_item.quantity_to_ship,
          COALESCE(v_product.allocated_stock, 0),
          GREATEST(0, COALESCE(v_product.allocated_stock, 0) - v_item.quantity_to_ship),
          COALESCE(v_product.inbound_stock, 0),
          COALESCE(v_product.inbound_stock, 0),
          'completed',
          'Shipment ' || v_shipment_number || ' for Order ' || v_order.order_number,
          v_order.brand_id,
          p_user_id
        );
      END IF;
    END IF;
    
    -- Create shipment item
    INSERT INTO shipment_items (
      shipment_id,
      order_line_id,
      product_id,
      sku,
      product_name,
      quantity_shipped,
      unit_price,
      cost_price
    ) VALUES (
      v_shipment_id,
      v_item.order_line_id,
      v_item.product_id,
      v_order_line.sku,
      v_order_line.product_name,
      v_item.quantity_to_ship,
      COALESCE(v_item.unit_price, v_order_line.unit_price),
      v_cost_price
    );
    
    -- Update order line shipped_quantity
    UPDATE order_lines
    SET shipped_quantity = COALESCE(shipped_quantity, 0) + v_item.quantity_to_ship,
        updated_at = NOW()
    WHERE id = v_item.order_line_id;
    
    -- Accumulate totals
    v_total_items := v_total_items + v_item.quantity_to_ship;
    v_total_value := v_total_value + (v_item.quantity_to_ship * COALESCE(v_item.unit_price, v_order_line.unit_price));
  END LOOP;
  
  -- 8. Update shipment totals
  UPDATE shipments
  SET total_items_shipped = v_total_items,
      total_value = v_total_value
  WHERE id = v_shipment_id;
  
  -- 9. Calculate and update order fulfilment status
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
  
  -- 10. Create notification (FIXED: using 'shipment' instead of 'shipping')
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    brand_id,
    related_entity_type,
    related_entity_id,
    priority,
    action_required,
    action_url,
    is_read
  )
  SELECT 
    up.user_id,
    'shipment'::notification_type,
    'Shipment Created',
    'Shipment ' || v_shipment_number || ' has been created for order ' || v_order.order_number,
    v_order.brand_id,
    'shipment',
    v_shipment_id,
    'medium'::notification_priority,
    false,
    '/orders/' || p_order_id,
    false
  FROM user_profiles up
  WHERE up.brand_id = v_order.brand_id
    AND up.user_status = 'approved'
    AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_logistics')
  UNION
  SELECT 
    up.user_id,
    'shipment'::notification_type,
    'Shipment Created',
    'Shipment ' || v_shipment_number || ' has been created for order ' || v_order.order_number,
    v_order.brand_id,
    'shipment',
    v_shipment_id,
    'medium'::notification_priority,
    false,
    '/orders/' || p_order_id,
    false
  FROM user_profiles up
  WHERE up.distributor_id = v_order.distributor_id
    AND v_order.distributor_id IS NOT NULL
    AND up.user_status = 'approved';
  
  -- 11. Return success with shipment details
  SELECT jsonb_build_object(
    'success', true,
    'shipment_id', v_shipment_id,
    'shipment_number', v_shipment_number,
    'total_items', v_total_items,
    'total_value', v_total_value,
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
-- 2. RECREATE update_shipment_status FUNCTION
-- Fix: Use 'shipment' instead of 'shipping' for notification_type
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
  v_current_status VARCHAR;
  v_valid_transition BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Get current shipment
  SELECT * INTO v_shipment FROM shipments WHERE id = p_shipment_id;
  
  IF v_shipment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shipment not found');
  END IF;
  
  -- Get current status (handle enum type by casting to text)
  v_current_status := v_shipment.shipment_status::TEXT;
  
  -- Validate status transition
  CASE v_current_status
    WHEN 'pending' THEN
      v_valid_transition := p_new_status IN ('processing', 'in_transit', 'cancelled');
    WHEN 'processing' THEN
      v_valid_transition := p_new_status IN ('in_transit', 'shipped', 'cancelled');
    WHEN 'in_transit' THEN
      v_valid_transition := p_new_status IN ('out_for_delivery', 'delivered', 'failed');
    WHEN 'out_for_delivery' THEN
      v_valid_transition := p_new_status IN ('delivered', 'failed');
    WHEN 'shipped' THEN
      v_valid_transition := p_new_status IN ('delivered', 'failed');
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
  
  -- Update shipment status (using existing column names)
  UPDATE shipments
  SET shipment_status = p_new_status::shipment_status,
      shipped_date = CASE WHEN p_new_status IN ('shipped', 'in_transit') THEN COALESCE(shipped_date, NOW()) ELSE shipped_date END,
      actual_delivery_date = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE actual_delivery_date END,
      notes = CASE WHEN p_notes IS NOT NULL THEN COALESCE(notes, '') || E'\n' || p_notes ELSE notes END,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_shipment_id;
  
  -- Create notification based on status (FIXED: using 'shipment' instead of 'shipping')
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    brand_id,
    related_entity_type,
    related_entity_id,
    priority,
    action_required,
    action_url,
    is_read
  )
  SELECT 
    up.user_id,
    'shipment'::notification_type,
    CASE p_new_status
      WHEN 'shipped' THEN 'Shipment Shipped'
      WHEN 'in_transit' THEN 'Shipment In Transit'
      WHEN 'delivered' THEN 'Shipment Delivered'
      WHEN 'cancelled' THEN 'Shipment Cancelled'
      WHEN 'failed' THEN 'Shipment Failed'
      ELSE 'Shipment Status Updated'
    END,
    'Shipment ' || v_shipment.shipment_number || ' is now ' || p_new_status,
    v_shipment.brand_id,
    'shipment',
    p_shipment_id,
    (CASE WHEN p_new_status = 'delivered' THEN 'low' WHEN p_new_status = 'failed' THEN 'high' ELSE 'medium' END)::notification_priority,
    false,
    '/orders/' || v_shipment.order_id,
    false
  FROM user_profiles up
  WHERE up.brand_id = v_shipment.brand_id
    AND up.user_status = 'approved'
    AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_logistics')
  UNION
  SELECT 
    up.user_id,
    'shipment'::notification_type,
    CASE p_new_status
      WHEN 'shipped' THEN 'Shipment Shipped'
      WHEN 'in_transit' THEN 'Shipment In Transit'
      WHEN 'delivered' THEN 'Shipment Delivered'
      WHEN 'cancelled' THEN 'Shipment Cancelled'
      WHEN 'failed' THEN 'Shipment Failed'
      ELSE 'Shipment Status Updated'
    END,
    'Shipment ' || v_shipment.shipment_number || ' is now ' || p_new_status,
    v_shipment.brand_id,
    'shipment',
    p_shipment_id,
    (CASE WHEN p_new_status = 'delivered' THEN 'low' WHEN p_new_status = 'failed' THEN 'high' ELSE 'medium' END)::notification_priority,
    false,
    '/orders/' || v_shipment.order_id,
    false
  FROM user_profiles up
  WHERE up.distributor_id = v_shipment.distributor_id
    AND v_shipment.distributor_id IS NOT NULL
    AND up.user_status = 'approved';
  
  -- If delivered, update order status
  IF p_new_status = 'delivered' THEN
    -- Check if all shipments for this order are delivered
    IF NOT EXISTS (
      SELECT 1 FROM shipments 
      WHERE order_id = v_shipment.order_id 
        AND shipment_status NOT IN ('delivered', 'cancelled', 'returned')
        AND id != p_shipment_id
    ) THEN
      -- Update order status to delivered
      UPDATE orders
      SET order_status = 'delivered',
          actual_delivery_date = NOW()::DATE,
          updated_by = p_user_id,
          updated_at = NOW()
      WHERE id = v_shipment.order_id
        AND order_status != 'delivered';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'shipment_id', p_shipment_id,
    'new_status', p_new_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ================================================
-- 3. ADD COMMENTS
-- ================================================

COMMENT ON FUNCTION create_shipment_transaction IS 'Atomic function to create a shipment with items, update inventory, and trigger notifications. Fixed to use correct notification_type enum value.';
COMMENT ON FUNCTION update_shipment_status IS 'Update shipment status with validation and notifications. Fixed to use correct notification_type enum value.';

COMMIT;

-- ================================================
-- VERIFICATION (run separately after applying migration)
-- ================================================
-- Test shipment creation:
-- SELECT create_shipment_transaction(
--   'your-order-uuid'::uuid,
--   'UPS',
--   'TEST123',
--   'ground',
--   'Test shipment',
--   '[{"order_line_id": "your-line-uuid", "quantity_to_ship": 1}]'::jsonb,
--   'your-user-uuid'::uuid
-- );

