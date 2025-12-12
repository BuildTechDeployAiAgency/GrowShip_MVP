-- =============================================
-- MARKETING CAMPAIGNS ROLLBACK SCRIPT
-- Use this to restore from backup if migration fails
-- =============================================

-- WARNING: This script will restore your old marketing campaigns table
-- and REMOVE the new comprehensive schema. Use only if migration failed!

DO $$
DECLARE
    backup_table_name TEXT;
    backup_count INTEGER := 0;
    current_count INTEGER := 0;
BEGIN
    -- Find the most recent backup table
    SELECT table_name INTO backup_table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'marketing_campaigns_backup_%'
    ORDER BY table_name DESC
    LIMIT 1;
    
    IF backup_table_name IS NULL THEN
        RAISE EXCEPTION 'No backup table found! Cannot rollback migration.';
    END IF;
    
    RAISE NOTICE 'Found backup table: %', backup_table_name;
    
    -- Get record counts for verification
    EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO backup_count;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
        SELECT COUNT(*) INTO current_count FROM marketing_campaigns;
        RAISE NOTICE 'Current marketing_campaigns has % records', current_count;
    END IF;
    
    RAISE NOTICE 'Backup table has % records', backup_count;
    RAISE NOTICE 'Starting rollback process...';
    
    -- Drop current table
    DROP TABLE IF EXISTS public.marketing_campaigns CASCADE;
    
    -- Restore from backup by renaming backup table
    EXECUTE format('ALTER TABLE %I RENAME TO marketing_campaigns', backup_table_name);
    
    -- Recreate basic indexes (from original schema)
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_organization_id 
    ON public.marketing_campaigns USING btree (brand_id);
    
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status 
    ON public.marketing_campaigns USING btree (status);
    
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by 
    ON public.marketing_campaigns USING btree (created_by);
    
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_id 
    ON public.marketing_campaigns USING btree (brand_id);
    
    -- Verify record count
    SELECT COUNT(*) INTO current_count FROM marketing_campaigns;
    
    IF current_count = backup_count THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'ROLLBACK COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Restored % records from backup', current_count;
        RAISE NOTICE 'Marketing campaigns table restored to previous state';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING 'Record count mismatch after rollback!';
        RAISE WARNING 'Expected: %, Got: %', backup_count, current_count;
    END IF;

END $$;

-- Cleanup any remaining backup tables (optional)
-- Uncomment these lines if you want to remove ALL backup tables after successful rollback
/*
DO $$
DECLARE
    backup_table TEXT;
BEGIN
    FOR backup_table IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'marketing_campaigns_backup_%'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', backup_table);
        RAISE NOTICE 'Cleaned up backup table: %', backup_table;
    END LOOP;
END $$;
*/

-- Verification queries to run after rollback
-- Uncomment these to check your data after rollback

/*
-- Check table structure
\d marketing_campaigns;

-- Check data integrity
SELECT 
    COUNT(*) as total_campaigns,
    COUNT(DISTINCT brand_id) as unique_brands,
    MIN(created_at) as oldest_campaign,
    MAX(created_at) as newest_campaign
FROM marketing_campaigns;

-- Check for any data issues
SELECT 
    id, name, brand_id, status, created_at
FROM marketing_campaigns 
ORDER BY created_at DESC 
LIMIT 10;
*/