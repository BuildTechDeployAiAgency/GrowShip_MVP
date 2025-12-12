-- =============================================
-- Marketing Campaigns Comprehensive Schema Update
-- Matches TypeScript interface from types/marketing.ts
-- =============================================

-- Drop existing table if needed (CAUTION: This will delete data)
-- DROP TABLE IF EXISTS public.marketing_campaigns CASCADE;

-- Create comprehensive marketing_campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  -- Primary Key
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_code VARCHAR(100) UNIQUE,
  
  -- Hierarchy and Ownership
  brand_id UUID NOT NULL,
  distributor_id UUID,
  region_id UUID,
  country_code VARCHAR(3),
  
  -- Campaign Classification
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
    'brand_awareness', 'product_launch', 'seasonal', 'promotional',
    'digital_marketing', 'trade_show', 'print_advertising', 
    'content_marketing', 'social_media', 'email_marketing', 
    'influencer', 'partnership'
  )),
  channel VARCHAR(50) NOT NULL CHECK (channel IN (
    'digital', 'print', 'radio', 'tv', 'outdoor', 'social_media',
    'email', 'content', 'events', 'partnerships', 'direct_mail'
  )),
  target_audience TEXT,
  
  -- Budget and Financial
  total_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_budget NUMERIC(12,2) GENERATED ALWAYS AS (allocated_budget - spent_budget) STORED,
  
  -- Fund Allocation
  fund_source VARCHAR(50) CHECK (fund_source IN (
    'brand_direct', 'mdf', 'coop', 'distributor_self', 'shared'
  )),
  brand_contribution NUMERIC(12,2) NOT NULL DEFAULT 0,
  distributor_contribution NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  launch_date DATE,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'active', 
    'paused', 'completed', 'cancelled', 'under_review'
  )),
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected', 'requires_revision'
  )),
  
  -- Performance Targets
  target_reach INTEGER,
  target_impressions INTEGER,
  target_leads INTEGER,
  target_sales_amount NUMERIC(12,2),
  target_roi_percentage NUMERIC(5,2),
  
  -- Actual Performance
  actual_reach INTEGER NOT NULL DEFAULT 0,
  actual_impressions INTEGER NOT NULL DEFAULT 0,
  actual_leads INTEGER NOT NULL DEFAULT 0,
  actual_sales_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_roi_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- ROI Calculations
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  attributed_orders INTEGER NOT NULL DEFAULT 0,
  cost_per_acquisition NUMERIC(12,2),
  return_on_ad_spend NUMERIC(8,4),
  
  -- Approval and Tracking
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[], -- Array of tags
  external_campaign_id VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_campaigns_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
  CONSTRAINT marketing_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT marketing_campaigns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id),
  CONSTRAINT marketing_campaigns_date_check CHECK (end_date >= start_date),
  CONSTRAINT marketing_campaigns_budget_check CHECK (total_budget >= 0 AND allocated_budget >= 0 AND spent_budget >= 0),
  CONSTRAINT marketing_campaigns_allocation_check CHECK (allocated_budget <= total_budget),
  CONSTRAINT marketing_campaigns_contribution_check CHECK (brand_contribution >= 0 AND distributor_contribution >= 0)
) TABLESPACE pg_default;

-- =============================================
-- Indexes for Performance
-- =============================================

-- Primary indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_id ON public.marketing_campaigns USING btree (brand_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_distributor_id ON public.marketing_campaigns USING btree (distributor_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns USING btree (status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_approval_status ON public.marketing_campaigns USING btree (approval_status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns USING btree (created_by);

-- Date range indexes for filtering
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_date_range ON public.marketing_campaigns USING btree (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON public.marketing_campaigns USING btree (created_at);

-- Campaign classification indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON public.marketing_campaigns USING btree (campaign_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel ON public.marketing_campaigns USING btree (channel);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_budget ON public.marketing_campaigns USING btree (total_budget);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_roi ON public.marketing_campaigns USING btree (actual_roi_percentage);

-- Regional indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_region ON public.marketing_campaigns USING btree (region_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_country ON public.marketing_campaigns USING btree (country_code);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_name ON public.marketing_campaigns USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_description ON public.marketing_campaigns USING gin (to_tsvector('english', COALESCE(description, '')));

-- Tags index for array operations
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tags ON public.marketing_campaigns USING gin (tags);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_status ON public.marketing_campaigns USING btree (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_distributor_status ON public.marketing_campaigns USING btree (distributor_id, status) WHERE distributor_id IS NOT NULL;

-- =============================================
-- Triggers for Updated_At
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trigger_update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaigns_updated_at();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy for viewing campaigns
CREATE POLICY "Users can view campaigns based on their role and organization" 
ON public.marketing_campaigns FOR SELECT 
USING (
  -- Super admins can see all campaigns
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand users can see campaigns for their brand
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_user')
  )
  OR
  -- Distributors can see campaigns assigned to them
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.distributor_id = marketing_campaigns.distributor_id
    AND up.role_name IN ('distributor_admin', 'distributor_manager', 'distributor_user')
  )
);

-- Policy for creating campaigns
CREATE POLICY "Users can create campaigns based on their role" 
ON public.marketing_campaigns FOR INSERT 
WITH CHECK (
  -- Super admins can create any campaign
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand admins/managers can create campaigns for their brand
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager')
  )
);

-- Policy for updating campaigns
CREATE POLICY "Users can update campaigns based on their role" 
ON public.marketing_campaigns FOR UPDATE 
USING (
  -- Super admins can update any campaign
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand users can update campaigns for their brand
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager')
  )
  OR
  -- Campaign creators can update their own campaigns
  marketing_campaigns.created_by = auth.uid()
);

-- Policy for deleting campaigns
CREATE POLICY "Users can delete campaigns based on their role" 
ON public.marketing_campaigns FOR DELETE 
USING (
  -- Super admins can delete any campaign
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand admins can delete campaigns for their brand
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name = 'brand_admin'
  )
);

-- =============================================
-- Utility Functions
-- =============================================

-- Function to generate campaign code
CREATE OR REPLACE FUNCTION generate_campaign_code(campaign_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 1;
BEGIN
  -- Create base code from campaign name
  base_code := UPPER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(campaign_name, '[^a-zA-Z0-9]', '_', 'g'),
      '_{2,}', '_', 'g'
    )
  );
  
  -- Limit to 20 characters
  base_code := SUBSTRING(base_code, 1, 20);
  
  -- Add timestamp suffix
  base_code := base_code || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
  
  -- Ensure uniqueness
  final_code := base_code;
  WHILE EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_code = final_code) LOOP
    final_code := base_code || '_' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Migration Notes
-- =============================================

/*
MIGRATION INSTRUCTIONS:

1. Backup existing data:
   pg_dump -h <host> -U <user> -d <database> -t marketing_campaigns > backup_marketing_campaigns.sql

2. If you have existing campaigns in the old schema:
   - Create a temporary table with old data
   - Run this schema update
   - Migrate data from temp table to new schema with appropriate mappings

3. Update your application's TypeScript types to use the new field names if needed

4. Test the API endpoints after migration

COLUMN MAPPING (Old -> New):
- budget -> total_budget (you may need to set allocated_budget = total_budget)
- Add default values for new required fields
- Set remaining_budget as computed column

IMPORTANT: This migration adds many new NOT NULL columns with defaults.
Existing campaigns will get default values which you may need to update.
*/