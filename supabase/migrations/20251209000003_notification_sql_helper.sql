-- ============================================================================
-- Migration: PL/PGSQL Notification Helper Function
-- Date: 2025-12-09
-- Description: Creates a SQL helper function for role-based notification dispatch
--              Used by database triggers (shipments, etc.) that need to create
--              notifications directly from SQL without going through TypeScript
-- ============================================================================

-- ============================================================================
-- 1. MAIN HELPER FUNCTION: create_role_based_notification
-- ============================================================================

CREATE OR REPLACE FUNCTION create_role_based_notification(
  p_type_key VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_brand_id UUID DEFAULT NULL,
  p_distributor_id UUID DEFAULT NULL,
  p_related_entity_type VARCHAR DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_action_url VARCHAR DEFAULT NULL,
  p_priority_override notification_priority DEFAULT NULL,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_notification_type RECORD;
  v_role_setting RECORD;
  v_user RECORD;
  v_priority notification_priority;
  v_action_required BOOLEAN;
  v_notifications_created INTEGER := 0;
  v_processed_users UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 1. Get notification type configuration
  SELECT id, key, default_priority, default_action_required
  INTO v_notification_type
  FROM notification_types
  WHERE key = p_type_key
    AND is_active = true;
  
  IF v_notification_type.id IS NULL THEN
    RAISE WARNING '[create_role_based_notification] Unknown notification type: %', p_type_key;
    RETURN 0;
  END IF;
  
  -- 2. Determine priority
  v_priority := COALESCE(p_priority_override, v_notification_type.default_priority);
  v_action_required := v_notification_type.default_action_required;
  
  -- 3. Loop through enabled role settings for this notification type
  FOR v_role_setting IN
    SELECT role, frequency, channels
    FROM notification_role_settings
    WHERE notification_type_id = v_notification_type.id
      AND is_enabled = true
  LOOP
    -- 4. Resolve users based on role type
    IF v_role_setting.role = 'super_admin' THEN
      -- Super admins are global
      FOR v_user IN
        SELECT user_id FROM user_profiles
        WHERE role_name = 'super_admin'
          AND user_status = 'approved'
          AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id)
      LOOP
        -- Skip if already processed
        IF v_user.user_id = ANY(v_processed_users) THEN
          CONTINUE;
        END IF;
        
        -- Check user preference (if exists)
        IF NOT check_user_notification_preference(v_user.user_id, p_type_key) THEN
          CONTINUE;
        END IF;
        
        -- Create notification (instant delivery for SQL triggers)
        IF v_role_setting.frequency = 'instant' THEN
          INSERT INTO notifications (
            user_id, type, title, message, brand_id,
            related_entity_type, related_entity_id,
            priority, action_required, action_url, is_read
          ) VALUES (
            v_user.user_id, p_type_key, p_title, p_message, p_brand_id,
            p_related_entity_type, p_related_entity_id,
            v_priority, v_action_required, p_action_url, false
          );
        ELSE
          -- Queue for digest
          INSERT INTO notification_digests (
            user_id, notification_type_id, frequency, data, status
          ) VALUES (
            v_user.user_id,
            v_notification_type.id,
            v_role_setting.frequency,
            jsonb_build_object(
              'title', p_title,
              'message', p_message,
              'brandId', p_brand_id,
              'relatedEntityType', p_related_entity_type,
              'relatedEntityId', p_related_entity_id,
              'actionUrl', p_action_url,
              'priority', v_priority
            ),
            'pending'
          );
        END IF;
        
        v_notifications_created := v_notifications_created + 1;
        v_processed_users := array_append(v_processed_users, v_user.user_id);
      END LOOP;
      
    ELSIF v_role_setting.role LIKE 'distributor_%' THEN
      -- Distributor roles - filter by distributor_id
      IF p_distributor_id IS NOT NULL THEN
        FOR v_user IN
          SELECT user_id FROM user_profiles
          WHERE distributor_id = p_distributor_id
            AND role_name = v_role_setting.role
            AND user_status = 'approved'
            AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id)
        LOOP
          -- Skip if already processed
          IF v_user.user_id = ANY(v_processed_users) THEN
            CONTINUE;
          END IF;
          
          -- Check user preference
          IF NOT check_user_notification_preference(v_user.user_id, p_type_key) THEN
            CONTINUE;
          END IF;
          
          -- Create notification
          IF v_role_setting.frequency = 'instant' THEN
            INSERT INTO notifications (
              user_id, type, title, message, brand_id,
              related_entity_type, related_entity_id,
              priority, action_required, action_url, is_read
            ) VALUES (
              v_user.user_id, p_type_key, p_title, p_message, p_brand_id,
              p_related_entity_type, p_related_entity_id,
              v_priority, v_action_required, p_action_url, false
            );
          ELSE
            INSERT INTO notification_digests (
              user_id, notification_type_id, frequency, data, status
            ) VALUES (
              v_user.user_id,
              v_notification_type.id,
              v_role_setting.frequency,
              jsonb_build_object(
                'title', p_title,
                'message', p_message,
                'brandId', p_brand_id,
                'relatedEntityType', p_related_entity_type,
                'relatedEntityId', p_related_entity_id,
                'actionUrl', p_action_url,
                'priority', v_priority
              ),
              'pending'
            );
          END IF;
          
          v_notifications_created := v_notifications_created + 1;
          v_processed_users := array_append(v_processed_users, v_user.user_id);
        END LOOP;
      END IF;
      
    ELSE
      -- Brand roles - filter by brand_id
      IF p_brand_id IS NOT NULL THEN
        FOR v_user IN
          SELECT user_id FROM user_profiles
          WHERE brand_id = p_brand_id
            AND role_name = v_role_setting.role
            AND user_status = 'approved'
            AND (p_exclude_user_id IS NULL OR user_id != p_exclude_user_id)
        LOOP
          -- Skip if already processed
          IF v_user.user_id = ANY(v_processed_users) THEN
            CONTINUE;
          END IF;
          
          -- Check user preference
          IF NOT check_user_notification_preference(v_user.user_id, p_type_key) THEN
            CONTINUE;
          END IF;
          
          -- Create notification
          IF v_role_setting.frequency = 'instant' THEN
            INSERT INTO notifications (
              user_id, type, title, message, brand_id,
              related_entity_type, related_entity_id,
              priority, action_required, action_url, is_read
            ) VALUES (
              v_user.user_id, p_type_key, p_title, p_message, p_brand_id,
              p_related_entity_type, p_related_entity_id,
              v_priority, v_action_required, p_action_url, false
            );
          ELSE
            INSERT INTO notification_digests (
              user_id, notification_type_id, frequency, data, status
            ) VALUES (
              v_user.user_id,
              v_notification_type.id,
              v_role_setting.frequency,
              jsonb_build_object(
                'title', p_title,
                'message', p_message,
                'brandId', p_brand_id,
                'relatedEntityType', p_related_entity_type,
                'relatedEntityId', p_related_entity_id,
                'actionUrl', p_action_url,
                'priority', v_priority
              ),
              'pending'
            );
          END IF;
          
          v_notifications_created := v_notifications_created + 1;
          v_processed_users := array_append(v_processed_users, v_user.user_id);
        END LOOP;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_notifications_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_role_based_notification IS 
  'Creates notifications for all enabled roles based on notification_role_settings. 
   Used by database triggers that need to send notifications directly from SQL.';

-- ============================================================================
-- 2. HELPER: Check User Notification Preference
-- ============================================================================

CREATE OR REPLACE FUNCTION check_user_notification_preference(
  p_user_id UUID,
  p_notification_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT in_app_enabled INTO v_enabled
  FROM notification_preferences
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type;
  
  -- Default to true if no preference exists
  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. SPECIALIZED FUNCTIONS FOR SHIPMENTS
-- ============================================================================

-- Function to create shipment notification using the role-based system
CREATE OR REPLACE FUNCTION create_shipment_notification(
  p_shipment_id UUID,
  p_shipment_number VARCHAR,
  p_order_number VARCHAR,
  p_brand_id UUID,
  p_distributor_id UUID,
  p_status VARCHAR,
  p_action_url VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_type_key VARCHAR;
  v_title VARCHAR;
  v_message TEXT;
  v_priority notification_priority;
BEGIN
  -- Map shipment status to notification type key
  CASE p_status
    WHEN 'pending', 'processing' THEN
      v_type_key := 'shipment_created';
      v_title := 'Shipment Created';
      v_priority := 'medium';
    WHEN 'shipped' THEN
      v_type_key := 'shipment_shipped';
      v_title := 'Shipment Shipped';
      v_priority := 'medium';
    WHEN 'in_transit' THEN
      v_type_key := 'shipment_in_transit';
      v_title := 'Shipment In Transit';
      v_priority := 'medium';
    WHEN 'delivered' THEN
      v_type_key := 'shipment_delivered';
      v_title := 'Shipment Delivered';
      v_priority := 'low';
    WHEN 'cancelled' THEN
      v_type_key := 'shipment_cancelled';
      v_title := 'Shipment Cancelled';
      v_priority := 'medium';
    WHEN 'failed' THEN
      v_type_key := 'shipment_failed';
      v_title := 'Shipment Failed';
      v_priority := 'high';
    ELSE
      v_type_key := 'shipment_created';
      v_title := 'Shipment Status Updated';
      v_priority := 'medium';
  END CASE;
  
  v_message := 'Shipment ' || p_shipment_number || ' for order ' || p_order_number || ' is now ' || p_status;
  
  -- Use the role-based notification function
  RETURN create_role_based_notification(
    v_type_key,
    v_title,
    v_message,
    p_brand_id,
    p_distributor_id,
    'shipment',
    p_shipment_id,
    p_action_url,
    v_priority,
    NULL -- no excluded user
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_shipment_notification IS 
  'Wrapper function to create shipment notifications using the role-based system.
   Maps shipment status to the appropriate notification type key.';

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_role_based_notification TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_notification_preference TO authenticated;
GRANT EXECUTE ON FUNCTION create_shipment_notification TO authenticated;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notification SQL Helper Functions Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - create_role_based_notification(type_key, title, message, ...)';
  RAISE NOTICE '  - check_user_notification_preference(user_id, type)';
  RAISE NOTICE '  - create_shipment_notification(shipment_id, number, status, ...)';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage in shipment functions:';
  RAISE NOTICE '  PERFORM create_shipment_notification(';
  RAISE NOTICE '    v_shipment_id, v_shipment_number, v_order_number,';
  RAISE NOTICE '    v_brand_id, v_distributor_id, ''shipped'', ''/orders/'' || v_order_id';
  RAISE NOTICE '  );';
  RAISE NOTICE '========================================';
END $$;
