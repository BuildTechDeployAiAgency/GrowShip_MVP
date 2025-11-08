-- ================================================
-- IMPORT LOGS TABLE FOR ORDERS IMPORT FEATURE
-- ================================================
-- Created: 2025-11-08
-- Purpose: Track all import attempts with metadata, errors, and status
-- Related Feature: Orders Import Feature

-- Create import_logs table
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  distributor_id uuid REFERENCES distributors(id) ON DELETE SET NULL,
  
  -- Import metadata
  import_type varchar NOT NULL DEFAULT 'orders',
  file_name varchar NOT NULL,
  file_hash varchar NOT NULL,
  
  -- Import statistics
  total_rows int NOT NULL CHECK (total_rows >= 0),
  successful_rows int DEFAULT 0 CHECK (successful_rows >= 0),
  failed_rows int DEFAULT 0 CHECK (failed_rows >= 0),
  
  -- Status tracking
  status varchar NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  
  -- Error and metadata storage
  error_details jsonb,
  metadata jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_logs_user_id ON import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_brand_id ON import_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_distributor_id ON import_logs(distributor_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_file_hash ON import_logs(file_hash);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_import_type ON import_logs(import_type);

-- Enable Row Level Security
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own import logs" ON import_logs;
DROP POLICY IF EXISTS "Super admins can view all import logs" ON import_logs;
DROP POLICY IF EXISTS "Brand admins can view their brand import logs" ON import_logs;
DROP POLICY IF EXISTS "Users can insert their own import logs" ON import_logs;
DROP POLICY IF EXISTS "Users can update their own import logs" ON import_logs;

-- RLS Policy: Users can view their own import logs
CREATE POLICY "Users can view their own import logs"
  ON import_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- RLS Policy: Super admins can view all import logs
CREATE POLICY "Super admins can view all import logs"
  ON import_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role_name = 'super_admin'
    )
  );

-- RLS Policy: Brand admins can view their brand's import logs
CREATE POLICY "Brand admins can view their brand import logs"
  ON import_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.brand_id = import_logs.brand_id
      AND user_profiles.role_name LIKE 'brand_%'
    )
  );

-- RLS Policy: Users can insert their own import logs
CREATE POLICY "Users can insert their own import logs"
  ON import_logs
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- RLS Policy: Users can update their own import logs
CREATE POLICY "Users can update their own import logs"
  ON import_logs
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

-- Add comment to table
COMMENT ON TABLE import_logs IS 'Tracks all file import attempts (orders, products, etc.) with status, errors, and metadata';

-- Add comments to important columns
COMMENT ON COLUMN import_logs.file_hash IS 'SHA-256 hash of the uploaded file for duplicate detection';
COMMENT ON COLUMN import_logs.error_details IS 'JSONB array of validation errors with row numbers and messages';
COMMENT ON COLUMN import_logs.metadata IS 'Additional metadata like file size, processing time, user agent, etc.';
COMMENT ON COLUMN import_logs.status IS 'Import status: processing, completed, failed, or partial (some rows failed)';

