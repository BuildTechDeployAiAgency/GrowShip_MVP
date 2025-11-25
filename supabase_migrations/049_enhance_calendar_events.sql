-- ================================================
-- MIGRATION 049: ENHANCE CALENDAR EVENTS TABLE
-- ================================================
-- Description: Create/enhance calendar_events table with distributor_id, status, and expanded event types
-- Date: November 24, 2025
-- Author: GrowShip MVP Team
-- Note: This migration is self-contained and will create the base table if it doesn't exist
-- ================================================

BEGIN;

-- ================================================
-- 1. CREATE BASE EVENT TYPE ENUM (if not exists)
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
-- 2. CREATE BASE CALENDAR_EVENTS TABLE (if not exists)
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
-- 3. CREATE BASE INDEXES (if not exists)
-- ================================================

CREATE INDEX IF NOT EXISTS idx_calendar_events_brand_id ON calendar_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related_entity ON calendar_events(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_brand_date ON calendar_events(brand_id, event_date);

-- ================================================
-- 4. ENABLE RLS (if not enabled)
-- ================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. ADD NEW EVENT TYPES TO ENUM
-- ================================================

DO $$ 
BEGIN
  -- Check and add each new type one by one
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'calendar_event_type' AND e.enumlabel = 'delivery_milestone'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'delivery_milestone';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'calendar_event_type' AND e.enumlabel = 'compliance_review'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'compliance_review';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'calendar_event_type' AND e.enumlabel = 'campaign_start'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'campaign_start';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'calendar_event_type' AND e.enumlabel = 'campaign_end'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'campaign_end';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'calendar_event_type' AND e.enumlabel = 'backorder_review'
  ) THEN
    ALTER TYPE calendar_event_type ADD VALUE 'backorder_review';
  END IF;
END $$;

-- ================================================
-- 6. CREATE EVENT STATUS ENUM
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_status') THEN
    CREATE TYPE calendar_event_status AS ENUM (
      'upcoming',
      'done',
      'overdue',
      'cancelled'
    );
  END IF;
END $$;

-- ================================================
-- 7. ADD NEW COLUMNS TO CALENDAR_EVENTS TABLE
-- ================================================

-- Add distributor_id for role-based filtering
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS distributor_id UUID REFERENCES distributors(id) ON DELETE CASCADE;

-- Add status column with default 'upcoming'
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS status calendar_event_status DEFAULT 'upcoming';

-- Add completed_at timestamp
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add completed_by user reference
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);

-- Add cancelled_at timestamp
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add cancelled_by user reference
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- ================================================
-- 8. CREATE ADDITIONAL INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_calendar_events_distributor_id ON calendar_events(distributor_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_brand_distributor ON calendar_events(brand_id, distributor_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status_date ON calendar_events(status, event_date);

-- ================================================
-- 9. UPDATE RLS POLICIES FOR DISTRIBUTOR ACCESS
-- ================================================

-- Drop existing policies to recreate them with distributor logic
DROP POLICY IF EXISTS "Users can view events for their brand" ON calendar_events;
DROP POLICY IF EXISTS "Users can view events for their brand or distributor" ON calendar_events;
DROP POLICY IF EXISTS "Users can insert events for their brand" ON calendar_events;
DROP POLICY IF EXISTS "Users can update events for their brand" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete events for their brand" ON calendar_events;

-- Users can view events for their brand OR distributor
CREATE POLICY "Users can view events for their brand or distributor"
  ON calendar_events
  FOR SELECT
  USING (
    -- Super admins can see everything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
    OR
    -- Brand users can see events for their brand
    (
      brand_id IN (
        SELECT brand_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
    OR
    -- Distributor users can see events for their distributor
    (
      distributor_id IN (
        SELECT distributor_id FROM user_profiles
        WHERE user_id = auth.uid()
        AND distributor_id IS NOT NULL
      )
    )
  );

-- Users can insert events for their brand
CREATE POLICY "Users can insert events for their brand"
  ON calendar_events
  FOR INSERT
  WITH CHECK (
    -- Super admins can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
    OR
    -- Brand users can insert events for their brand
    (
      brand_id IN (
        SELECT brand_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update events for their brand
CREATE POLICY "Users can update events for their brand"
  ON calendar_events
  FOR UPDATE
  USING (
    -- Super admins can update anything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
    OR
    -- Brand users can update events for their brand
    (
      brand_id IN (
        SELECT brand_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Same check for after update
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
    OR
    (
      brand_id IN (
        SELECT brand_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can delete events for their brand
CREATE POLICY "Users can delete events for their brand"
  ON calendar_events
  FOR DELETE
  USING (
    -- Super admins can delete anything
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role_name = 'super_admin'
    )
    OR
    -- Brand users can delete events for their brand
    (
      brand_id IN (
        SELECT brand_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- ================================================
-- 10. CREATE/UPDATE TRIGGER FOR UPDATED_AT
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

-- ================================================
-- 11. CREATE FUNCTION TO AUTO-UPDATE STATUS
-- ================================================

-- Function to automatically mark events as overdue
CREATE OR REPLACE FUNCTION update_calendar_event_status()
RETURNS void AS $$
BEGIN
  -- Mark upcoming events as overdue if their date has passed
  UPDATE calendar_events
  SET status = 'overdue'
  WHERE status = 'upcoming'
    AND event_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_calendar_event_status() IS 'Automatically marks upcoming events as overdue when their date passes';

COMMIT;

-- ================================================
-- VERIFICATION QUERIES (run separately after migration)
-- ================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'calendar_events' ORDER BY ordinal_position;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'calendar_event_type');
-- SELECT * FROM calendar_events LIMIT 5;
