-- =============================================
-- SAFE MARKETING CAMPAIGNS MIGRATION SCRIPT (FIXED)
-- Preserves existing data while updating schema
-- =============================================

-- Step 1: Check if old table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'marketing_campaigns') THEN
        RAISE NOTICE 'Existing marketing_campaigns table found. Starting safe migration...';
    ELSE
        RAISE NOTICE 'No existing marketing_campaigns table found. Will create new table.';
    END IF;
END $$;

-- Step 2: Backup existing data if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'marketing_campaigns') THEN
        
        -- Create backup table with timestamp
        EXECUTE format('CREATE TABLE marketing_campaigns_backup_%s AS SELECT * FROM marketing_campaigns', 
                      to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));
        
        RAISE NOTICE 'Backup created: marketing_campaigns_backup_%', to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
        
        -- Show current data count
        DECLARE 
            record_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO record_count FROM marketing_campaigns;
            RAISE NOTICE 'Backed up % existing campaign records', record_count;
        END;
    END IF;
END $$;

-- Step 3: Drop existing table and constraints
DROP TABLE IF EXISTS public.marketing_campaigns CASCADE;

-- Step 4: Create utility functions first
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating utility functions...'; 
END $$;

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
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_campaigns') THEN
    WHILE EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_code = final_code) LOOP
      final_code := base_code || '_' || counter;
      counter := counter + 1;
    END LOOP;
  END IF;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create comprehensive marketing_campaigns table
CREATE TABLE public.marketing_campaigns (
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
  tags TEXT[],
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
);

-- Step 6: Migrate data from backup if it exists
DO $$
DECLARE
    backup_table_name TEXT;
    record_count INTEGER := 0;
    migrated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting data migration...';
    
    -- Find the most recent backup table
    SELECT table_name INTO backup_table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'marketing_campaigns_backup_%'
    ORDER BY table_name DESC
    LIMIT 1;
    
    IF backup_table_name IS NOT NULL THEN
        RAISE NOTICE 'Found backup table: %', backup_table_name;
        
        -- Get count of records to migrate
        EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO record_count;
        RAISE NOTICE 'Found % records to migrate', record_count;
        
        IF record_count > 0 THEN
            -- Migrate data with field mapping
            EXECUTE format('
                INSERT INTO marketing_campaigns (
                    id,
                    name,
                    description,
                    brand_id,
                    campaign_type,
                    start_date,
                    end_date,
                    total_budget,
                    allocated_budget,
                    spent_budget,
                    status,
                    created_by,
                    created_at,
                    updated_at,
                    channel,
                    approval_status,
                    brand_contribution,
                    distributor_contribution,
                    fund_source
                )
                SELECT 
                    id,
                    name,
                    description,
                    brand_id,
                    COALESCE(campaign_type, ''promotional''),
                    start_date,
                    end_date,
                    COALESCE(budget, 0),
                    COALESCE(budget, 0),
                    0,
                    COALESCE(status, ''draft''),
                    created_by,
                    created_at,
                    updated_at,
                    ''digital'',
                    ''pending'',
                    COALESCE(budget, 0),
                    0,
                    ''brand_direct''
                FROM %I
                WHERE name IS NOT NULL
            ', backup_table_name);
            
            -- Count migrated records
            SELECT COUNT(*) INTO migrated_count FROM marketing_campaigns;
            RAISE NOTICE 'Successfully migrated % records to new schema', migrated_count;
            
            -- Generate campaign codes for migrated records
            UPDATE marketing_campaigns 
            SET campaign_code = generate_campaign_code(name)
            WHERE campaign_code IS NULL;
            
            RAISE NOTICE 'Generated campaign codes for all records';
            
        END IF;
    ELSE
        RAISE NOTICE 'No backup table found. Starting with empty campaigns table.';
    END IF;
END $$;

-- Step 7: Create indexes
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating performance indexes...'; 
END $$;

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_id ON public.marketing_campaigns USING btree (brand_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_distributor_id ON public.marketing_campaigns USING btree (distributor_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns USING btree (status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_approval_status ON public.marketing_campaigns USING btree (approval_status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_date_range ON public.marketing_campaigns USING btree (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON public.marketing_campaigns USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON public.marketing_campaigns USING btree (campaign_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel ON public.marketing_campaigns USING btree (channel);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_budget ON public.marketing_campaigns USING btree (total_budget);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_roi ON public.marketing_campaigns USING btree (actual_roi_percentage);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_region ON public.marketing_campaigns USING btree (region_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_country ON public.marketing_campaigns USING btree (country_code);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_name ON public.marketing_campaigns USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_description ON public.marketing_campaigns USING gin (to_tsvector('english', COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tags ON public.marketing_campaigns USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_status ON public.marketing_campaigns USING btree (brand_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_distributor_status ON public.marketing_campaigns USING btree (distributor_id, status) WHERE distributor_id IS NOT NULL;

-- Step 8: Create triggers
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating triggers...'; 
END $$;

CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trigger_update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaigns_updated_at();

-- Step 9: Enable Row Level Security
DO $$ 
BEGIN 
    RAISE NOTICE 'Setting up Row Level Security...'; 
END $$;

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view campaigns based on their role and organization" ON public.marketing_campaigns;
CREATE POLICY "Users can view campaigns based on their role and organization" 
ON public.marketing_campaigns FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_user')
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.distributor_id = marketing_campaigns.distributor_id
    AND up.role_name IN ('distributor_admin', 'distributor_manager', 'distributor_user')
  )
);

DROP POLICY IF EXISTS "Users can create campaigns based on their role" ON public.marketing_campaigns;
CREATE POLICY "Users can create campaigns based on their role" 
ON public.marketing_campaigns FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager')
  )
);

DROP POLICY IF EXISTS "Users can update campaigns based on their role" ON public.marketing_campaigns;
CREATE POLICY "Users can update campaigns based on their role" 
ON public.marketing_campaigns FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager')
  )
  OR
  marketing_campaigns.created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete campaigns based on their role" ON public.marketing_campaigns;
CREATE POLICY "Users can delete campaigns based on their role" 
ON public.marketing_campaigns FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = marketing_campaigns.brand_id
    AND up.role_name = 'brand_admin'
  )
);

-- Step 10: Final validation and summary
DO $$
DECLARE
    campaign_count INTEGER;
    backup_count INTEGER;
    backup_table_name TEXT;
BEGIN
    -- Count final records
    SELECT COUNT(*) INTO campaign_count FROM marketing_campaigns;
    
    -- Find backup table
    SELECT table_name INTO backup_table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'marketing_campaigns_backup_%'
    ORDER BY table_name DESC
    LIMIT 1;
    
    IF backup_table_name IS NOT NULL THEN
        EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO backup_count;
        RAISE NOTICE '========================================';
        RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Original records: %', backup_count;
        RAISE NOTICE 'Migrated records: %', campaign_count;
        RAISE NOTICE 'Backup table: %', backup_table_name;
        RAISE NOTICE '========================================';
        
        IF campaign_count != backup_count THEN
            RAISE WARNING 'Record count mismatch! Please review migration.';
        END IF;
    ELSE
        RAISE NOTICE '========================================';
        RAISE NOTICE 'NEW TABLE CREATED SUCCESSFULLY!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'No existing data to migrate.';
        RAISE NOTICE 'Ready for new marketing campaigns!';
        RAISE NOTICE '========================================';
    END IF;
END $$;