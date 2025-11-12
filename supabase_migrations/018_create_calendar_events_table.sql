-- ================================================
-- MIGRATION 018: CREATE CALENDAR EVENTS TABLE
-- ================================================
-- Description: Create calendar_events table for event tracking
-- Date: November 12, 2025
-- Author: GrowShip MVP Team
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE EVENT TYPE ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_type') THEN
    CREATE TYPE calendar_event_type AS ENUM (
      'payment_due',
      'po_approval_due',
      'shipment_arrival',
      'pop_upload_due',
      'custom'
    );
  END IF;
END $$;

-- ================================================
-- 2. CREATE CALENDAR_EVENTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  event_type calendar_event_type NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time,
  related_entity_type varchar(50),
  related_entity_id uuid,
  is_all_day boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- 3. CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_calendar_events_brand_id ON calendar_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related_entity ON calendar_events(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_brand_date ON calendar_events(brand_id, event_date);

-- ================================================
-- 4. CREATE RLS POLICIES
-- ================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view events for their brand
CREATE POLICY "Users can view events for their brand"
  ON calendar_events
  FOR SELECT
  USING (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can insert events for their brand
CREATE POLICY "Users can insert events for their brand"
  ON calendar_events
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can update events for their brand
CREATE POLICY "Users can update events for their brand"
  ON calendar_events
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- Users can delete events for their brand
CREATE POLICY "Users can delete events for their brand"
  ON calendar_events
  FOR DELETE
  USING (
    brand_id IN (
      SELECT brand_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
  );

-- ================================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

COMMIT;

-- Verification queries (run separately)
-- SELECT * FROM calendar_events LIMIT 5;


