-- =============================================
-- MARKETING CAMPAIGNS MIGRATION VALIDATION
-- Run these queries to verify migration success
-- =============================================

-- Query 1: Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'marketing_campaigns'
ORDER BY ordinal_position;

-- Query 2: Verify data migration counts
DO $$
DECLARE
    current_count INTEGER;
    backup_table_name TEXT;
    backup_count INTEGER := 0;
BEGIN
    -- Count current records
    SELECT COUNT(*) INTO current_count FROM marketing_campaigns;
    
    -- Find backup table
    SELECT table_name INTO backup_table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'marketing_campaigns_backup_%'
    ORDER BY table_name DESC
    LIMIT 1;
    
    IF backup_table_name IS NOT NULL THEN
        EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO backup_count;
    END IF;
    
    RAISE NOTICE 'Migration Validation Results:';
    RAISE NOTICE '- Current campaigns: %', current_count;
    RAISE NOTICE '- Backup campaigns: %', backup_count;
    RAISE NOTICE '- Backup table: %', COALESCE(backup_table_name, 'None found');
    
    IF backup_count > 0 AND current_count != backup_count THEN
        RAISE WARNING 'Count mismatch detected!';
    ELSIF backup_count > 0 THEN
        RAISE NOTICE 'Migration count verification: PASSED';
    END IF;
END $$;

-- Query 3: Check required fields are populated
SELECT 
    'Data Validation' as check_type,
    CASE 
        WHEN COUNT(*) FILTER (WHERE name IS NULL OR name = '') > 0 
        THEN 'FAILED: Found campaigns without names'
        ELSE 'PASSED: All campaigns have names'
    END as name_check,
    CASE 
        WHEN COUNT(*) FILTER (WHERE brand_id IS NULL) > 0 
        THEN 'FAILED: Found campaigns without brand_id'
        ELSE 'PASSED: All campaigns have brand_id'
    END as brand_check,
    CASE 
        WHEN COUNT(*) FILTER (WHERE campaign_type IS NULL OR campaign_type = '') > 0 
        THEN 'FAILED: Found campaigns without campaign_type'
        ELSE 'PASSED: All campaigns have campaign_type'
    END as type_check,
    CASE 
        WHEN COUNT(*) FILTER (WHERE channel IS NULL OR channel = '') > 0 
        THEN 'FAILED: Found campaigns without channel'
        ELSE 'PASSED: All campaigns have channel'
    END as channel_check
FROM marketing_campaigns;

-- Query 4: Check budget field mapping
SELECT 
    'Budget Migration' as check_type,
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE total_budget > 0) as campaigns_with_budget,
    ROUND(AVG(total_budget), 2) as avg_total_budget,
    ROUND(AVG(allocated_budget), 2) as avg_allocated_budget,
    COUNT(*) FILTER (WHERE total_budget = allocated_budget) as equal_budget_allocation,
    COUNT(*) FILTER (WHERE brand_contribution > 0) as campaigns_with_brand_contribution
FROM marketing_campaigns;

-- Query 5: Check date integrity
SELECT 
    'Date Validation' as check_type,
    COUNT(*) FILTER (WHERE start_date IS NULL) as missing_start_dates,
    COUNT(*) FILTER (WHERE end_date IS NULL) as missing_end_dates,
    COUNT(*) FILTER (WHERE end_date <= start_date) as invalid_date_ranges,
    MIN(start_date) as earliest_start_date,
    MAX(end_date) as latest_end_date
FROM marketing_campaigns;

-- Query 6: Check campaign codes generation
SELECT 
    'Campaign Code Check' as check_type,
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE campaign_code IS NOT NULL AND campaign_code != '') as campaigns_with_codes,
    COUNT(DISTINCT campaign_code) as unique_codes,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT campaign_code) AND COUNT(*) FILTER (WHERE campaign_code IS NULL) = 0
        THEN 'PASSED: All campaigns have unique codes'
        ELSE 'FAILED: Missing or duplicate campaign codes'
    END as code_validation
FROM marketing_campaigns;

-- Query 7: Check indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'marketing_campaigns'
AND schemaname = 'public'
ORDER BY indexname;

-- Query 8: Check RLS policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'marketing_campaigns'
ORDER BY policyname;

-- Query 9: Test campaign type constraints
SELECT DISTINCT campaign_type, COUNT(*)
FROM marketing_campaigns
GROUP BY campaign_type
ORDER BY count DESC;

-- Query 10: Test channel constraints
SELECT DISTINCT channel, COUNT(*)
FROM marketing_campaigns
GROUP BY channel
ORDER BY count DESC;

-- Query 11: Sample data preview
SELECT 
    id,
    name,
    campaign_type,
    channel,
    total_budget,
    allocated_budget,
    status,
    approval_status,
    brand_id,
    start_date,
    end_date,
    created_at
FROM marketing_campaigns
ORDER BY created_at DESC
LIMIT 5;

-- Query 12: Check trigger functionality
-- This will test the updated_at trigger
BEGIN;
    UPDATE marketing_campaigns 
    SET description = COALESCE(description, '') || ' [Migration Test]'
    WHERE id IN (SELECT id FROM marketing_campaigns LIMIT 1);
    
    SELECT 
        'Trigger Test' as test_type,
        CASE 
            WHEN updated_at > created_at 
            THEN 'PASSED: updated_at trigger working'
            ELSE 'FAILED: updated_at trigger not working'
        END as trigger_status
    FROM marketing_campaigns 
    WHERE description LIKE '%[Migration Test]%'
    LIMIT 1;
    
ROLLBACK; -- Don't save the test change

-- Query 13: Foreign key validation
SELECT 
    'Foreign Key Check' as check_type,
    COUNT(*) as total_campaigns,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM brands WHERE brands.id = marketing_campaigns.brand_id)) as valid_brand_references,
    COUNT(*) FILTER (WHERE brand_id NOT IN (SELECT id FROM brands WHERE id IS NOT NULL)) as invalid_brand_references
FROM marketing_campaigns;

-- Summary validation report
DO $$
DECLARE
    total_campaigns INTEGER;
    campaigns_with_required_fields INTEGER;
    campaigns_with_valid_budgets INTEGER;
    campaigns_with_valid_dates INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_campaigns FROM marketing_campaigns;
    
    SELECT COUNT(*) INTO campaigns_with_required_fields 
    FROM marketing_campaigns 
    WHERE name IS NOT NULL 
    AND name != '' 
    AND brand_id IS NOT NULL 
    AND campaign_type IS NOT NULL 
    AND channel IS NOT NULL;
    
    SELECT COUNT(*) INTO campaigns_with_valid_budgets
    FROM marketing_campaigns 
    WHERE total_budget >= 0 
    AND allocated_budget >= 0 
    AND allocated_budget <= total_budget;
    
    SELECT COUNT(*) INTO campaigns_with_valid_dates
    FROM marketing_campaigns 
    WHERE start_date IS NOT NULL 
    AND end_date IS NOT NULL 
    AND end_date > start_date;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MIGRATION VALIDATION SUMMARY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total campaigns migrated: %', total_campaigns;
    RAISE NOTICE 'Campaigns with required fields: % (%)', campaigns_with_required_fields, 
                 ROUND((campaigns_with_required_fields::DECIMAL / NULLIF(total_campaigns, 0)) * 100, 1);
    RAISE NOTICE 'Campaigns with valid budgets: % (%)', campaigns_with_valid_budgets,
                 ROUND((campaigns_with_valid_budgets::DECIMAL / NULLIF(total_campaigns, 0)) * 100, 1);
    RAISE NOTICE 'Campaigns with valid dates: % (%)', campaigns_with_valid_dates,
                 ROUND((campaigns_with_valid_dates::DECIMAL / NULLIF(total_campaigns, 0)) * 100, 1);
    
    IF total_campaigns > 0 THEN
        IF campaigns_with_required_fields = total_campaigns 
           AND campaigns_with_valid_budgets = total_campaigns 
           AND campaigns_with_valid_dates = total_campaigns THEN
            RAISE NOTICE 'OVERALL STATUS: MIGRATION SUCCESSFUL ✓';
        ELSE
            RAISE NOTICE 'OVERALL STATUS: MIGRATION NEEDS REVIEW ⚠️';
        END IF;
    ELSE
        RAISE NOTICE 'OVERALL STATUS: EMPTY TABLE - READY FOR NEW DATA ✓';
    END IF;
    RAISE NOTICE '================================================';
END $$;