-- ================================================
-- MIGRATION 016: ENHANCE NOTIFICATIONS TABLE
-- ================================================
-- Description: Add enhanced fields to notifications table and create notification_preferences table
-- Date: November 12, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE PRIORITY ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

-- ================================================
-- 2. CREATE FREQUENCY ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_frequency') THEN
    CREATE TYPE notification_frequency AS ENUM ('immediate', 'daily_digest', 'weekly_digest');
  END IF;
END $$;

-- ================================================
-- 3. ADD COLUMNS TO NOTIFICATIONS TABLE
-- ================================================

-- Add related_entity_type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_entity_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_entity_type varchar;
  END IF;
END $$;

-- Add related_entity_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_entity_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_entity_id uuid;
  END IF;
END $$;

-- Add priority if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority notification_priority DEFAULT 'medium';
  END IF;
END $$;

-- Add action_required if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'action_required'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_required boolean DEFAULT false;
  END IF;
END $$;

-- Add action_url if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_url text;
  END IF;
END $$;

-- Add expires_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

-- ================================================
-- 4. CREATE INDEXES FOR NEW COLUMNS
-- ================================================

CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_action_required ON notifications(action_required);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- ================================================
-- 5. CREATE NOTIFICATION_PREFERENCES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  frequency notification_frequency DEFAULT 'immediate',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- ================================================
-- 6. CREATE INDEXES FOR NOTIFICATION_PREFERENCES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- ================================================
-- 7. CREATE RLS POLICIES FOR NOTIFICATION_PREFERENCES
-- ================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Super admins can view all preferences
CREATE POLICY "Super admins can view all notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role_name = 'super_admin'
    )
  );

-- ================================================
-- 8. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

COMMIT;

-- Verification queries (run separately)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position;
-- SELECT * FROM notification_preferences LIMIT 5;


