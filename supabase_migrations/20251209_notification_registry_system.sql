-- ============================================================================
-- Migration: Notification Registry & Role-Based Settings System
-- Date: 2025-12-09
-- Description: Creates a scalable, configurable notification system with:
--   - notification_types: Registry of all system notifications
--   - notification_role_settings: Per-role configuration for each notification
--   - notification_digests: Queue for digest-based delivery
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Notification category enum
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'purchase_order',
    'inventory',
    'payment',
    'shipment',
    'order',
    'calendar',
    'compliance',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notification frequency enum
DO $$ BEGIN
  CREATE TYPE notification_frequency AS ENUM (
    'instant',
    'hourly_digest',
    'daily_digest',
    'weekly_digest'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Digest status enum
DO $$ BEGIN
  CREATE TYPE digest_status AS ENUM (
    'pending',
    'processed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. NOTIFICATION_TYPES TABLE (Registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category notification_category NOT NULL,
  description TEXT,
  default_priority notification_priority DEFAULT 'medium',
  default_action_required BOOLEAN DEFAULT false,
  supported_roles TEXT[] DEFAULT ARRAY['brand_admin', 'brand_manager', 'brand_logistics', 'brand_reviewer', 'distributor_admin', 'super_admin'],
  module VARCHAR(100), -- e.g., 'po-alerts', 'inventory-alerts', 'shipment-sql'
  trigger_location VARCHAR(255), -- File path or function name
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by key
CREATE INDEX IF NOT EXISTS idx_notification_types_key ON notification_types(key);
CREATE INDEX IF NOT EXISTS idx_notification_types_category ON notification_types(category);
CREATE INDEX IF NOT EXISTS idx_notification_types_active ON notification_types(is_active) WHERE is_active = true;

COMMENT ON TABLE notification_types IS 'Registry of all system notification types with metadata';
COMMENT ON COLUMN notification_types.key IS 'Unique identifier used in code (e.g., po_created, shipment_shipped)';
COMMENT ON COLUMN notification_types.supported_roles IS 'Array of roles that can potentially receive this notification';
COMMENT ON COLUMN notification_types.module IS 'The module/file that triggers this notification';

-- ============================================================================
-- 3. NOTIFICATION_ROLE_SETTINGS TABLE (Configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_role_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type_id UUID NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  frequency notification_frequency DEFAULT 'instant',
  channels JSONB DEFAULT '["in_app"]'::jsonb,
  -- Future flags (placeholders)
  escalation_enabled BOOLEAN DEFAULT false,
  escalation_after_hours INTEGER, -- Hours before escalation
  escalation_to_role VARCHAR(50),
  custom_thresholds JSONB, -- For threshold-based notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_notification_role UNIQUE (notification_type_id, role)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notification_role_settings_type ON notification_role_settings(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_notification_role_settings_role ON notification_role_settings(role);
CREATE INDEX IF NOT EXISTS idx_notification_role_settings_enabled ON notification_role_settings(is_enabled) WHERE is_enabled = true;

COMMENT ON TABLE notification_role_settings IS 'Per-role configuration for each notification type';
COMMENT ON COLUMN notification_role_settings.channels IS 'Array of delivery channels: in_app, email, sms (future)';
COMMENT ON COLUMN notification_role_settings.escalation_enabled IS 'Future: Whether to escalate if not acknowledged';

-- ============================================================================
-- 4. NOTIFICATION_DIGESTS TABLE (Queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type_id UUID NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
  frequency notification_frequency NOT NULL,
  data JSONB NOT NULL, -- Snapshot: {title, message, action_url, related_entity_type, related_entity_id, brand_id, priority}
  status digest_status DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ, -- When this digest item should be processed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for digest processing
CREATE INDEX IF NOT EXISTS idx_notification_digests_user ON notification_digests(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_digests_status ON notification_digests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_digests_scheduled ON notification_digests(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_digests_frequency ON notification_digests(frequency, status);

COMMENT ON TABLE notification_digests IS 'Queue for notifications to be sent as digests (hourly, daily, weekly)';

-- ============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to notification_types
DROP TRIGGER IF EXISTS trigger_notification_types_updated_at ON notification_types;
CREATE TRIGGER trigger_notification_types_updated_at
  BEFORE UPDATE ON notification_types
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- Apply trigger to notification_role_settings
DROP TRIGGER IF EXISTS trigger_notification_role_settings_updated_at ON notification_role_settings;
CREATE TRIGGER trigger_notification_role_settings_updated_at
  BEFORE UPDATE ON notification_role_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_role_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digests ENABLE ROW LEVEL SECURITY;

-- notification_types: Read-only for all authenticated, manage by super_admin
DROP POLICY IF EXISTS "Anyone can read notification types" ON notification_types;
CREATE POLICY "Anyone can read notification types"
  ON notification_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage notification types" ON notification_types;
CREATE POLICY "Super admins can manage notification types"
  ON notification_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
      AND user_status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
      AND user_status = 'approved'
    )
  );

-- notification_role_settings: Read-only for all authenticated, manage by super_admin
DROP POLICY IF EXISTS "Anyone can read notification settings" ON notification_role_settings;
CREATE POLICY "Anyone can read notification settings"
  ON notification_role_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage notification settings" ON notification_role_settings;
CREATE POLICY "Super admins can manage notification settings"
  ON notification_role_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
      AND user_status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
      AND user_status = 'approved'
    )
  );

-- notification_digests: Users can only see their own digest items
DROP POLICY IF EXISTS "Users can view own digest items" ON notification_digests;
CREATE POLICY "Users can view own digest items"
  ON notification_digests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert digest items" ON notification_digests;
CREATE POLICY "System can insert digest items"
  ON notification_digests FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Inserts are done via admin client

DROP POLICY IF EXISTS "Super admins can manage all digests" ON notification_digests;
CREATE POLICY "Super admins can manage all digests"
  ON notification_digests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
      AND user_status = 'approved'
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get notification settings for a specific type and role
CREATE OR REPLACE FUNCTION get_notification_setting(
  p_type_key VARCHAR,
  p_role VARCHAR
)
RETURNS TABLE (
  is_enabled BOOLEAN,
  frequency notification_frequency,
  channels JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(nrs.is_enabled, true) AS is_enabled,
    COALESCE(nrs.frequency, 'instant'::notification_frequency) AS frequency,
    COALESCE(nrs.channels, '["in_app"]'::jsonb) AS channels
  FROM notification_types nt
  LEFT JOIN notification_role_settings nrs 
    ON nrs.notification_type_id = nt.id 
    AND nrs.role = p_role
  WHERE nt.key = p_type_key
    AND nt.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all enabled roles for a notification type
CREATE OR REPLACE FUNCTION get_enabled_roles_for_notification(
  p_type_key VARCHAR
)
RETURNS TABLE (
  role VARCHAR,
  frequency notification_frequency,
  channels JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nrs.role,
    nrs.frequency,
    nrs.channels
  FROM notification_types nt
  INNER JOIN notification_role_settings nrs 
    ON nrs.notification_type_id = nt.id
  WHERE nt.key = p_type_key
    AND nt.is_active = true
    AND nrs.is_enabled = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a notification should be sent to a user
CREATE OR REPLACE FUNCTION should_send_notification(
  p_type_key VARCHAR,
  p_user_id UUID
)
RETURNS TABLE (
  should_send BOOLEAN,
  frequency notification_frequency,
  channels JSONB
) AS $$
DECLARE
  v_user_role VARCHAR;
BEGIN
  -- Get user's role
  SELECT role_name INTO v_user_role
  FROM user_profiles
  WHERE user_id = p_user_id
    AND user_status = 'approved';
  
  IF v_user_role IS NULL THEN
    RETURN QUERY SELECT false, 'instant'::notification_frequency, '[]'::jsonb;
    RETURN;
  END IF;
  
  -- Check settings for this notification type and role
  RETURN QUERY
  SELECT 
    COALESCE(nrs.is_enabled, true) AS should_send,
    COALESCE(nrs.frequency, 'instant'::notification_frequency) AS frequency,
    COALESCE(nrs.channels, '["in_app"]'::jsonb) AS channels
  FROM notification_types nt
  LEFT JOIN notification_role_settings nrs 
    ON nrs.notification_type_id = nt.id 
    AND nrs.role = v_user_role
  WHERE nt.key = p_type_key
    AND nt.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON notification_types TO authenticated;
GRANT SELECT ON notification_role_settings TO authenticated;
GRANT SELECT ON notification_digests TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_setting TO authenticated;
GRANT EXECUTE ON FUNCTION get_enabled_roles_for_notification TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification TO authenticated;

-- ============================================================================
-- 9. VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Notification Registry System Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - notification_types (Registry)';
  RAISE NOTICE '  - notification_role_settings (Configuration)';
  RAISE NOTICE '  - notification_digests (Queue)';
  RAISE NOTICE '';
  RAISE NOTICE 'Helper functions:';
  RAISE NOTICE '  - get_notification_setting(type_key, role)';
  RAISE NOTICE '  - get_enabled_roles_for_notification(type_key)';
  RAISE NOTICE '  - should_send_notification(type_key, user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run seed migration to populate notification_types';
  RAISE NOTICE '========================================';
END $$;
