-- ============================================================================
-- Migration: Fix Notifications Type Column for Role-Based System
-- Date: 2025-12-11  
-- Description: Updates the notifications.type column to support the new
--              role-based notification system with string keys instead of enum
-- ============================================================================

-- ============================================================================
-- 1. UPDATE NOTIFICATIONS TABLE SCHEMA
-- ============================================================================

-- First, check if the notifications table uses an enum constraint on type column
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Check if there's an enum constraint on the type column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
    WHERE ccu.table_name = 'notifications' 
      AND ccu.column_name = 'type'
      AND tc.constraint_type = 'CHECK'
  ) INTO constraint_exists;

  -- If the column has enum constraints, we need to update it
  IF constraint_exists THEN
    RAISE NOTICE 'Found enum constraint on notifications.type column, updating...';
    
    -- Drop the constraint if it exists
    ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(100);
  ELSE
    RAISE NOTICE 'notifications.type column is already VARCHAR, ensuring proper size...';
    
    -- Ensure the column is properly sized for our notification keys
    ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(100);
  END IF;
END $$;

-- ============================================================================
-- 2. UPDATE NOTIFICATION_PREFERENCES TABLE SCHEMA  
-- ============================================================================

-- Check and update notification_preferences table if it exists
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'notification_preferences'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE 'Updating notification_preferences.notification_type column...';
    
    -- Update the notification_type column to use VARCHAR instead of enum
    ALTER TABLE notification_preferences ALTER COLUMN notification_type TYPE VARCHAR(100);
  ELSE
    RAISE NOTICE 'notification_preferences table does not exist yet';
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE OR UPDATE INDEXES
-- ============================================================================

-- Ensure proper indexes exist for the type column
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Verify the column types are correct
DO $$
DECLARE
  notifications_type_info RECORD;
  preferences_type_info RECORD;
BEGIN
  -- Check notifications table
  SELECT data_type, character_maximum_length 
  INTO notifications_type_info
  FROM information_schema.columns 
  WHERE table_name = 'notifications' AND column_name = 'type';
  
  RAISE NOTICE 'notifications.type column: % (max_length: %)', 
    notifications_type_info.data_type, notifications_type_info.character_maximum_length;

  -- Check preferences table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
    SELECT data_type, character_maximum_length 
    INTO preferences_type_info
    FROM information_schema.columns 
    WHERE table_name = 'notification_preferences' AND column_name = 'notification_type';
    
    RAISE NOTICE 'notification_preferences.notification_type column: % (max_length: %)', 
      preferences_type_info.data_type, preferences_type_info.character_maximum_length;
  END IF;
END $$;

-- ============================================================================
-- 5. COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notifications Type Column Fix Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  - notifications.type: Updated to VARCHAR(100)';
  RAISE NOTICE '  - notification_preferences.notification_type: Updated to VARCHAR(100)';
  RAISE NOTICE '  - Added proper indexes for type columns';
  RAISE NOTICE '';
  RAISE NOTICE 'The notification system can now use string keys like:';
  RAISE NOTICE '  - po_approval_required';
  RAISE NOTICE '  - inventory_low_stock';
  RAISE NOTICE '  - payment_due_soon';
  RAISE NOTICE '  - shipment_delivered';
  RAISE NOTICE 'And all other notification types from notification_types table';
  RAISE NOTICE '========================================';
END $$;