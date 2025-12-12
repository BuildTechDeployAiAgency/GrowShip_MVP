-- =============================================
-- FINANCIAL VARIANCE CALCULATION VIEWS
-- Budget vs Actual Analysis and Reporting Views
-- =============================================

-- Step 1: Create Budget vs Actual Variance View
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating budget variance calculation views...'; 
END $$;

CREATE OR REPLACE VIEW budget_variance_analysis AS
WITH budget_spending AS (
    -- Calculate actual spending per budget from operational expenses
    SELECT 
        oe.budget_allocation_id,
        fb.id as budget_id,
        fb.brand_id,
        fb.distributor_id,
        fb.budget_category_id,
        SUM(CASE WHEN oe.status IN ('approved', 'paid') THEN oe.net_amount ELSE 0 END) as actual_spent,
        SUM(CASE WHEN oe.status = 'pending_approval' THEN oe.net_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN oe.status = 'paid' THEN oe.net_amount ELSE 0 END) as paid_amount,
        COUNT(oe.id) as expense_count,
        MAX(oe.expense_date) as last_expense_date
    FROM operational_expenses oe
    LEFT JOIN budget_allocations ba ON ba.id = oe.budget_allocation_id
    LEFT JOIN financial_budgets fb ON fb.id = ba.financial_budget_id
    WHERE oe.expense_date >= CURRENT_DATE - INTERVAL '365 days' -- Last year
    GROUP BY oe.budget_allocation_id, fb.id, fb.brand_id, fb.distributor_id, fb.budget_category_id
),
marketing_spending AS (
    -- Calculate marketing campaign spending for relevant budgets
    SELECT 
        mc.brand_id,
        mc.distributor_id,
        'marketing' as expense_category,
        SUM(mc.spent_budget) as marketing_spent,
        COUNT(mc.id) as campaign_count
    FROM marketing_campaigns mc
    WHERE mc.start_date >= CURRENT_DATE - INTERVAL '365 days'
    GROUP BY mc.brand_id, mc.distributor_id
)
SELECT 
    fb.id as budget_id,
    fb.budget_name,
    fb.budget_code,
    fb.brand_id,
    fb.distributor_id,
    fb.region_id,
    fb.fiscal_year,
    fb.period_type,
    fb.period_start_date,
    fb.period_end_date,
    
    -- Budget amounts
    fb.planned_amount,
    fb.allocated_amount,
    fb.spent_amount as recorded_spent_amount,
    
    -- Calculated actual spending
    COALESCE(bs.actual_spent, 0) + 
    CASE 
        WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
        ELSE 0 
    END as actual_spent_amount,
    
    COALESCE(bs.pending_amount, 0) as pending_expenses,
    COALESCE(bs.paid_amount, 0) as paid_amount,
    COALESCE(bs.expense_count, 0) as expense_count,
    bs.last_expense_date,
    
    -- Variance calculations
    fb.allocated_amount - (COALESCE(bs.actual_spent, 0) + 
        CASE 
            WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
            ELSE 0 
        END) as variance_amount,
    
    CASE 
        WHEN fb.allocated_amount > 0 THEN
            ((fb.allocated_amount - (COALESCE(bs.actual_spent, 0) + 
                CASE 
                    WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                    ELSE 0 
                END)) / fb.allocated_amount) * 100
        ELSE 0
    END as variance_percentage,
    
    -- Utilization metrics
    CASE 
        WHEN fb.allocated_amount > 0 THEN
            ((COALESCE(bs.actual_spent, 0) + 
                CASE 
                    WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                    ELSE 0 
                END) / fb.allocated_amount) * 100
        ELSE 0
    END as utilization_percentage,
    
    -- Status indicators
    CASE 
        WHEN (COALESCE(bs.actual_spent, 0) + 
              CASE 
                  WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                  ELSE 0 
              END) > fb.allocated_amount THEN 'over_budget'
        WHEN (COALESCE(bs.actual_spent, 0) + 
              CASE 
                  WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                  ELSE 0 
              END) > fb.allocated_amount * 0.9 THEN 'near_limit'
        WHEN (COALESCE(bs.actual_spent, 0) + 
              CASE 
                  WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                  ELSE 0 
              END) > fb.allocated_amount * 0.75 THEN 'on_track'
        ELSE 'under_utilized'
    END as budget_status,
    
    -- Time-based metrics
    CASE 
        WHEN fb.period_end_date > CURRENT_DATE THEN 
            EXTRACT(EPOCH FROM (fb.period_end_date - CURRENT_DATE)) / 86400
        ELSE 0
    END as days_remaining,
    
    CASE 
        WHEN fb.period_start_date <= CURRENT_DATE AND fb.period_end_date >= CURRENT_DATE THEN
            EXTRACT(EPOCH FROM (CURRENT_DATE - fb.period_start_date)) / 
            EXTRACT(EPOCH FROM (fb.period_end_date - fb.period_start_date))
        WHEN fb.period_end_date < CURRENT_DATE THEN 1
        ELSE 0
    END as period_progress_percentage,
    
    -- Budget category information
    bc.name as category_name,
    bc.category_type,
    bc.full_path as category_path,
    
    -- Efficiency metrics
    CASE 
        WHEN (COALESCE(bs.actual_spent, 0) + 
              CASE 
                  WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                  ELSE 0 
              END) > 0 AND fb.allocated_amount > 0 THEN
            LEAST(1.0, fb.allocated_amount / (COALESCE(bs.actual_spent, 0) + 
                CASE 
                    WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                    ELSE 0 
                END)) * 100
        ELSE 100
    END as budget_efficiency_score,
    
    -- Forecast projections based on current spend rate
    CASE 
        WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - fb.period_start_date)) > 0 
             AND fb.period_end_date > CURRENT_DATE THEN
            (COALESCE(bs.actual_spent, 0) + 
             CASE 
                 WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                 ELSE 0 
             END) * 
            (EXTRACT(EPOCH FROM (fb.period_end_date - fb.period_start_date)) / 
             EXTRACT(EPOCH FROM (CURRENT_DATE - fb.period_start_date)))
        ELSE (COALESCE(bs.actual_spent, 0) + 
              CASE 
                  WHEN bc.category_type = 'marketing' THEN COALESCE(ms.marketing_spent, 0)
                  ELSE 0 
              END)
    END as projected_total_spend,
    
    -- Timestamps
    fb.created_at,
    fb.updated_at,
    CURRENT_TIMESTAMP as analysis_timestamp

FROM financial_budgets fb
LEFT JOIN budget_spending bs ON bs.budget_id = fb.id
LEFT JOIN marketing_spending ms ON ms.brand_id = fb.brand_id 
    AND (ms.distributor_id = fb.distributor_id OR (ms.distributor_id IS NULL AND fb.distributor_id IS NULL))
LEFT JOIN budget_categories bc ON bc.id = fb.budget_category_id
WHERE fb.status IN ('approved', 'active', 'locked')
ORDER BY fb.brand_id, fb.fiscal_year DESC, fb.period_start_date DESC;

-- Step 2: Create Department Budget Performance View
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating department budget performance view...'; 
END $$;

CREATE OR REPLACE VIEW department_budget_performance AS
SELECT 
    bva.brand_id,
    bva.distributor_id,
    COALESCE(oe.department, 'Unassigned') as department,
    bva.fiscal_year,
    COUNT(DISTINCT bva.budget_id) as budget_count,
    
    -- Budget totals
    SUM(bva.planned_amount) as total_planned_budget,
    SUM(bva.allocated_amount) as total_allocated_budget,
    SUM(bva.actual_spent_amount) as total_actual_spending,
    SUM(bva.pending_expenses) as total_pending_expenses,
    
    -- Variance metrics
    SUM(bva.variance_amount) as total_variance,
    CASE 
        WHEN SUM(bva.allocated_amount) > 0 THEN
            AVG(bva.variance_percentage)
        ELSE 0
    END as avg_variance_percentage,
    
    -- Utilization metrics
    CASE 
        WHEN SUM(bva.allocated_amount) > 0 THEN
            (SUM(bva.actual_spent_amount) / SUM(bva.allocated_amount)) * 100
        ELSE 0
    END as overall_utilization_percentage,
    
    -- Performance indicators
    COUNT(CASE WHEN bva.budget_status = 'over_budget' THEN 1 END) as over_budget_count,
    COUNT(CASE WHEN bva.budget_status = 'near_limit' THEN 1 END) as near_limit_count,
    COUNT(CASE WHEN bva.budget_status = 'under_utilized' THEN 1 END) as under_utilized_count,
    
    -- Efficiency metrics
    AVG(bva.budget_efficiency_score) as avg_efficiency_score,
    SUM(bva.expense_count) as total_expense_transactions,
    
    -- Top spending categories
    (
        SELECT STRING_AGG(bc.name, ', ' ORDER BY SUM(oe2.net_amount) DESC)
        FROM operational_expenses oe2
        JOIN budget_categories bc ON bc.id = oe2.budget_category_id
        WHERE oe2.brand_id = bva.brand_id 
        AND oe2.department = COALESCE(oe.department, 'Unassigned')
        AND oe2.expense_date >= CURRENT_DATE - INTERVAL '365 days'
        GROUP BY bc.name
        LIMIT 3
    ) as top_spending_categories,
    
    CURRENT_TIMESTAMP as analysis_timestamp

FROM budget_variance_analysis bva
LEFT JOIN operational_expenses oe ON oe.brand_id = bva.brand_id
GROUP BY bva.brand_id, bva.distributor_id, COALESCE(oe.department, 'Unassigned'), bva.fiscal_year
ORDER BY bva.brand_id, total_actual_spending DESC;

-- Step 3: Create Monthly Spend Trend View
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating monthly spend trend view...'; 
END $$;

CREATE OR REPLACE VIEW monthly_spend_trends AS
WITH monthly_data AS (
    SELECT 
        oe.brand_id,
        oe.distributor_id,
        oe.department,
        oe.expense_type,
        DATE_TRUNC('month', oe.expense_date) as month_start,
        EXTRACT(YEAR FROM oe.expense_date) as year,
        EXTRACT(MONTH FROM oe.expense_date) as month,
        SUM(CASE WHEN oe.status IN ('approved', 'paid') THEN oe.net_amount ELSE 0 END) as actual_spending,
        SUM(CASE WHEN oe.status = 'pending_approval' THEN oe.net_amount ELSE 0 END) as pending_spending,
        COUNT(oe.id) as expense_count,
        AVG(oe.net_amount) as avg_expense_amount
    FROM operational_expenses oe
    WHERE oe.expense_date >= CURRENT_DATE - INTERVAL '24 months' -- Last 2 years
    GROUP BY oe.brand_id, oe.distributor_id, oe.department, oe.expense_type, 
             DATE_TRUNC('month', oe.expense_date), 
             EXTRACT(YEAR FROM oe.expense_date), 
             EXTRACT(MONTH FROM oe.expense_date)
),
budget_monthly AS (
    -- Get monthly budget allocations
    SELECT 
        fb.brand_id,
        fb.distributor_id,
        fb.department,
        DATE_TRUNC('month', fb.period_start_date) as month_start,
        EXTRACT(YEAR FROM fb.period_start_date) as year,
        EXTRACT(MONTH FROM fb.period_start_date) as month,
        SUM(fb.allocated_amount) as monthly_budget,
        COUNT(fb.id) as budget_count
    FROM financial_budgets fb
    WHERE fb.period_start_date >= CURRENT_DATE - INTERVAL '24 months'
    AND fb.period_type IN ('monthly', 'quarterly') -- Focus on shorter periods
    GROUP BY fb.brand_id, fb.distributor_id, fb.department,
             DATE_TRUNC('month', fb.period_start_date),
             EXTRACT(YEAR FROM fb.period_start_date),
             EXTRACT(MONTH FROM fb.period_start_date)
)
SELECT 
    COALESCE(md.brand_id, bm.brand_id) as brand_id,
    COALESCE(md.distributor_id, bm.distributor_id) as distributor_id,
    COALESCE(md.department, bm.department, 'All Departments') as department,
    COALESCE(md.month_start, bm.month_start) as month_start,
    COALESCE(md.year, bm.year) as year,
    COALESCE(md.month, bm.month) as month,
    
    -- Spending data
    COALESCE(md.actual_spending, 0) as actual_spending,
    COALESCE(md.pending_spending, 0) as pending_spending,
    COALESCE(md.expense_count, 0) as expense_count,
    COALESCE(md.avg_expense_amount, 0) as avg_expense_amount,
    
    -- Budget data
    COALESCE(bm.monthly_budget, 0) as monthly_budget,
    COALESCE(bm.budget_count, 0) as budget_count,
    
    -- Variance calculations
    COALESCE(bm.monthly_budget, 0) - COALESCE(md.actual_spending, 0) as variance_amount,
    
    CASE 
        WHEN COALESCE(bm.monthly_budget, 0) > 0 THEN
            ((COALESCE(bm.monthly_budget, 0) - COALESCE(md.actual_spending, 0)) / COALESCE(bm.monthly_budget, 0)) * 100
        ELSE 0
    END as variance_percentage,
    
    CASE 
        WHEN COALESCE(bm.monthly_budget, 0) > 0 THEN
            (COALESCE(md.actual_spending, 0) / COALESCE(bm.monthly_budget, 0)) * 100
        ELSE 0
    END as utilization_percentage,
    
    -- Year-over-year comparisons
    LAG(COALESCE(md.actual_spending, 0), 12) OVER (
        PARTITION BY COALESCE(md.brand_id, bm.brand_id), 
                     COALESCE(md.distributor_id, bm.distributor_id),
                     COALESCE(md.department, bm.department, 'All Departments')
        ORDER BY COALESCE(md.year, bm.year), COALESCE(md.month, bm.month)
    ) as spending_year_ago,
    
    -- Month-over-month growth
    LAG(COALESCE(md.actual_spending, 0), 1) OVER (
        PARTITION BY COALESCE(md.brand_id, bm.brand_id), 
                     COALESCE(md.distributor_id, bm.distributor_id),
                     COALESCE(md.department, bm.department, 'All Departments')
        ORDER BY COALESCE(md.year, bm.year), COALESCE(md.month, bm.month)
    ) as spending_last_month,
    
    CURRENT_TIMESTAMP as analysis_timestamp

FROM monthly_data md
FULL OUTER JOIN budget_monthly bm ON bm.brand_id = md.brand_id 
    AND bm.distributor_id = md.distributor_id 
    AND bm.department = md.department
    AND bm.month_start = md.month_start
ORDER BY COALESCE(md.brand_id, bm.brand_id), 
         COALESCE(md.year, bm.year) DESC, 
         COALESCE(md.month, bm.month) DESC;

-- Step 4: Create Budget Alert Conditions View
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating budget alert conditions view...'; 
END $$;

CREATE OR REPLACE VIEW budget_alert_conditions AS
SELECT 
    bva.budget_id,
    bva.budget_name,
    bva.brand_id,
    bva.distributor_id,
    bva.category_name,
    bva.actual_spent_amount,
    bva.allocated_amount,
    bva.utilization_percentage,
    bva.variance_percentage,
    bva.days_remaining,
    bva.projected_total_spend,
    
    -- Alert conditions
    CASE 
        WHEN bva.utilization_percentage >= 100 THEN 'CRITICAL'
        WHEN bva.utilization_percentage >= 90 THEN 'WARNING' 
        WHEN bva.utilization_percentage >= 80 THEN 'CAUTION'
        ELSE 'NORMAL'
    END as alert_level,
    
    CASE 
        WHEN bva.utilization_percentage >= 100 THEN 'Budget exceeded'
        WHEN bva.utilization_percentage >= 90 THEN 'Near budget limit'
        WHEN bva.utilization_percentage >= 80 THEN 'Approaching budget limit'
        WHEN bva.utilization_percentage < 50 AND bva.days_remaining < 30 THEN 'Budget underutilized'
        ELSE 'Budget on track'
    END as alert_message,
    
    -- Specific alert types
    CASE WHEN bva.utilization_percentage >= 100 THEN TRUE ELSE FALSE END as is_over_budget,
    CASE WHEN bva.utilization_percentage >= 90 AND bva.utilization_percentage < 100 THEN TRUE ELSE FALSE END as is_near_limit,
    CASE WHEN bva.projected_total_spend > bva.allocated_amount THEN TRUE ELSE FALSE END as is_projected_overrun,
    CASE WHEN bva.days_remaining <= 7 AND bva.utilization_percentage < 75 THEN TRUE ELSE FALSE END as is_underutilized,
    CASE WHEN bva.days_remaining <= 0 AND bva.utilization_percentage < 100 THEN TRUE ELSE FALSE END as is_expired_unused,
    
    -- Priority scoring (higher = more urgent)
    CASE 
        WHEN bva.utilization_percentage >= 100 THEN 100
        WHEN bva.utilization_percentage >= 95 THEN 90
        WHEN bva.utilization_percentage >= 90 THEN 80
        WHEN bva.projected_total_spend > bva.allocated_amount * 1.1 THEN 70
        WHEN bva.utilization_percentage >= 80 THEN 60
        WHEN bva.days_remaining <= 7 AND bva.utilization_percentage < 75 THEN 50
        WHEN bva.days_remaining <= 0 AND bva.utilization_percentage < 100 THEN 40
        ELSE 0
    END as alert_priority,
    
    bva.analysis_timestamp

FROM budget_variance_analysis bva
WHERE bva.utilization_percentage >= 80  -- Only show budgets that need attention
   OR bva.projected_total_spend > bva.allocated_amount
   OR (bva.days_remaining <= 7 AND bva.utilization_percentage < 75)
   OR (bva.days_remaining <= 0 AND bva.utilization_percentage < 100)
ORDER BY 
    CASE 
        WHEN bva.utilization_percentage >= 100 THEN 1
        WHEN bva.utilization_percentage >= 90 THEN 2
        WHEN bva.projected_total_spend > bva.allocated_amount THEN 3
        ELSE 4
    END,
    bva.utilization_percentage DESC;

-- Step 5: Create Indexes for Performance
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating indexes for variance views...'; 
END $$;

-- Indexes to support the views
CREATE INDEX IF NOT EXISTS idx_operational_expenses_budget_allocation ON operational_expenses(budget_allocation_id) WHERE budget_allocation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operational_expenses_expense_date ON operational_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_status_date ON operational_expenses(status, expense_date);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_brand_dept_date ON operational_expenses(brand_id, department, expense_date);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_brand_dates ON marketing_campaigns(brand_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_period_dates ON financial_budgets(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget_id ON budget_allocations(financial_budget_id);

-- Step 6: Create Helper Functions
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating variance calculation helper functions...'; 
END $$;

-- Function to get budget variance for specific budget
CREATE OR REPLACE FUNCTION get_budget_variance_details(p_budget_id UUID)
RETURNS TABLE (
    variance_amount NUMERIC,
    variance_percentage NUMERIC,
    utilization_percentage NUMERIC,
    budget_status TEXT,
    days_remaining INTEGER,
    projected_spend NUMERIC,
    alert_level TEXT,
    efficiency_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bva.variance_amount,
        bva.variance_percentage,
        bva.utilization_percentage,
        bva.budget_status,
        bva.days_remaining::INTEGER,
        bva.projected_total_spend,
        bac.alert_level,
        bva.budget_efficiency_score
    FROM budget_variance_analysis bva
    LEFT JOIN budget_alert_conditions bac ON bac.budget_id = bva.budget_id
    WHERE bva.budget_id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get department performance summary
CREATE OR REPLACE FUNCTION get_department_performance_summary(
    p_brand_id UUID,
    p_fiscal_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
    department TEXT,
    total_budget NUMERIC,
    total_spent NUMERIC,
    utilization_percent NUMERIC,
    variance_amount NUMERIC,
    efficiency_score NUMERIC,
    over_budget_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dbp.department,
        dbp.total_allocated_budget,
        dbp.total_actual_spending,
        dbp.overall_utilization_percentage,
        dbp.total_variance,
        dbp.avg_efficiency_score,
        dbp.over_budget_count
    FROM department_budget_performance dbp
    WHERE dbp.brand_id = p_brand_id
    AND (p_fiscal_year IS NULL OR dbp.fiscal_year = p_fiscal_year)
    ORDER BY dbp.total_actual_spending DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to generate variance alerts
CREATE OR REPLACE FUNCTION generate_budget_variance_alerts(p_brand_id UUID DEFAULT NULL)
RETURNS TABLE (
    budget_id UUID,
    budget_name VARCHAR,
    alert_level TEXT,
    alert_message TEXT,
    current_utilization NUMERIC,
    days_remaining INTEGER,
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bac.budget_id,
        bac.budget_name,
        bac.alert_level,
        bac.alert_message,
        bac.utilization_percentage,
        bac.days_remaining::INTEGER,
        bac.alert_priority
    FROM budget_alert_conditions bac
    WHERE (p_brand_id IS NULL OR bac.brand_id = p_brand_id)
    AND bac.alert_level != 'NORMAL'
    ORDER BY bac.alert_priority DESC, bac.utilization_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Final Success Message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BUDGET VARIANCE VIEWS CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Views created:';
    RAISE NOTICE '- budget_variance_analysis (comprehensive variance tracking)';
    RAISE NOTICE '- department_budget_performance (department-level analysis)';
    RAISE NOTICE '- monthly_spend_trends (monthly spending patterns)';
    RAISE NOTICE '- budget_alert_conditions (automated alert conditions)';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_budget_variance_details()';
    RAISE NOTICE '- get_department_performance_summary()'; 
    RAISE NOTICE '- generate_budget_variance_alerts()';
    RAISE NOTICE '';
    RAISE NOTICE 'Features implemented:';
    RAISE NOTICE '- Real-time variance calculations';
    RAISE NOTICE '- Budget utilization tracking';
    RAISE NOTICE '- Department performance analysis';
    RAISE NOTICE '- Monthly trend analysis';
    RAISE NOTICE '- Automated alert generation';
    RAISE NOTICE '- Projection algorithms';
    RAISE NOTICE '- Performance indexes';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Financial variance analysis ready!';
    RAISE NOTICE '========================================';
END $$;