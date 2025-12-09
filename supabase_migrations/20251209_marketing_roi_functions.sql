-- Migration: Marketing ROI Calculation Functions
-- Description: Advanced ROI calculation and analytics functions for marketing campaigns
-- Date: 2025-12-09

-- =============================================
-- Campaign ROI Summary Function
-- =============================================
CREATE OR REPLACE FUNCTION get_campaign_roi_summary(
    p_campaign_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL,
    p_distributor_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name VARCHAR,
    campaign_type VARCHAR,
    channel VARCHAR,
    total_budget DECIMAL,
    spent_budget DECIMAL,
    total_revenue DECIMAL,
    net_profit DECIMAL,
    roi_percentage DECIMAL,
    roas DECIMAL,
    cost_per_acquisition DECIMAL,
    attributed_orders INTEGER,
    budget_utilization DECIMAL,
    status VARCHAR,
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.campaign_type,
        c.channel,
        c.total_budget,
        c.spent_budget,
        c.total_revenue,
        (c.total_revenue - c.spent_budget) as net_profit,
        c.actual_roi_percentage,
        c.return_on_ad_spend,
        c.cost_per_acquisition,
        c.attributed_orders,
        CASE WHEN c.total_budget > 0 THEN (c.spent_budget / c.total_budget * 100) ELSE 0 END as budget_utilization,
        c.status,
        c.start_date,
        c.end_date
    FROM marketing_campaigns c
    WHERE 
        (p_campaign_id IS NULL OR c.id = p_campaign_id)
        AND (p_brand_id IS NULL OR c.brand_id = p_brand_id)
        AND (p_distributor_id IS NULL OR c.distributor_id = p_distributor_id)
        AND (p_start_date IS NULL OR c.start_date >= p_start_date)
        AND (p_end_date IS NULL OR c.end_date <= p_end_date)
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Channel Performance Analysis
-- =============================================
CREATE OR REPLACE FUNCTION get_channel_performance_analysis(
    p_brand_id UUID DEFAULT NULL,
    p_distributor_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    channel VARCHAR,
    campaign_count INTEGER,
    total_budget DECIMAL,
    total_spent DECIMAL,
    total_revenue DECIMAL,
    average_roi DECIMAL,
    average_roas DECIMAL,
    total_orders INTEGER,
    average_cpa DECIMAL,
    budget_efficiency DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.channel,
        COUNT(c.id)::INTEGER as campaign_count,
        SUM(c.total_budget) as total_budget,
        SUM(c.spent_budget) as total_spent,
        SUM(c.total_revenue) as total_revenue,
        AVG(c.actual_roi_percentage) as average_roi,
        AVG(c.return_on_ad_spend) as average_roas,
        SUM(c.attributed_orders)::INTEGER as total_orders,
        AVG(c.cost_per_acquisition) as average_cpa,
        CASE WHEN SUM(c.spent_budget) > 0 THEN 
            (SUM(c.total_revenue) / SUM(c.spent_budget) * 100) 
        ELSE 0 END as budget_efficiency
    FROM marketing_campaigns c
    WHERE 
        (p_brand_id IS NULL OR c.brand_id = p_brand_id)
        AND (p_distributor_id IS NULL OR c.distributor_id = p_distributor_id)
        AND (p_date_from IS NULL OR c.start_date >= p_date_from)
        AND (p_date_to IS NULL OR c.end_date <= p_date_to)
        AND c.status IN ('active', 'completed')
    GROUP BY c.channel
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Distributor Campaign Performance
-- =============================================
CREATE OR REPLACE FUNCTION get_distributor_campaign_performance(
    p_brand_id UUID DEFAULT NULL,
    p_period_months INTEGER DEFAULT 12
)
RETURNS TABLE (
    distributor_id UUID,
    distributor_name VARCHAR,
    campaign_count INTEGER,
    total_allocated_budget DECIMAL,
    total_spent_budget DECIMAL,
    total_revenue DECIMAL,
    average_roi DECIMAL,
    budget_utilization DECIMAL,
    top_performing_channel VARCHAR,
    underperforming_campaigns INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH distributor_stats AS (
        SELECT 
            c.distributor_id,
            d.company_name,
            COUNT(c.id) as campaign_count,
            SUM(c.allocated_budget) as total_allocated,
            SUM(c.spent_budget) as total_spent,
            SUM(c.total_revenue) as total_revenue,
            AVG(c.actual_roi_percentage) as avg_roi,
            CASE WHEN SUM(c.allocated_budget) > 0 THEN 
                (SUM(c.spent_budget) / SUM(c.allocated_budget) * 100) 
            ELSE 0 END as budget_util
        FROM marketing_campaigns c
        LEFT JOIN distributors d ON c.distributor_id = d.id
        WHERE 
            (p_brand_id IS NULL OR c.brand_id = p_brand_id)
            AND c.created_at >= NOW() - INTERVAL '%s months' 
            AND c.distributor_id IS NOT NULL
        GROUP BY c.distributor_id, d.company_name
    ),
    top_channels AS (
        SELECT DISTINCT ON (c.distributor_id)
            c.distributor_id,
            c.channel
        FROM marketing_campaigns c
        WHERE 
            (p_brand_id IS NULL OR c.brand_id = p_brand_id)
            AND c.created_at >= NOW() - INTERVAL '%s months'
            AND c.distributor_id IS NOT NULL
        ORDER BY c.distributor_id, c.total_revenue DESC
    ),
    underperforming AS (
        SELECT 
            c.distributor_id,
            COUNT(c.id) as underperforming_count
        FROM marketing_campaigns c
        WHERE 
            (p_brand_id IS NULL OR c.brand_id = p_brand_id)
            AND c.created_at >= NOW() - INTERVAL '%s months'
            AND c.distributor_id IS NOT NULL
            AND c.actual_roi_percentage < 0
        GROUP BY c.distributor_id
    )
    SELECT 
        ds.distributor_id,
        ds.company_name,
        ds.campaign_count::INTEGER,
        ds.total_allocated,
        ds.total_spent,
        ds.total_revenue,
        ds.avg_roi,
        ds.budget_util,
        tc.channel,
        COALESCE(up.underperforming_count, 0)::INTEGER
    FROM distributor_stats ds
    LEFT JOIN top_channels tc ON ds.distributor_id = tc.distributor_id
    LEFT JOIN underperforming up ON ds.distributor_id = up.distributor_id
    ORDER BY ds.total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Campaign Expense Analysis
-- =============================================
CREATE OR REPLACE FUNCTION get_campaign_expense_breakdown(
    p_campaign_id UUID
)
RETURNS TABLE (
    expense_type VARCHAR,
    total_amount DECIMAL,
    expense_count INTEGER,
    average_amount DECIMAL,
    percentage_of_budget DECIMAL,
    paid_amount DECIMAL,
    pending_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH campaign_budget AS (
        SELECT total_budget 
        FROM marketing_campaigns 
        WHERE id = p_campaign_id
    ),
    expense_summary AS (
        SELECT 
            ce.expense_type,
            SUM(ce.amount) as total_amt,
            COUNT(ce.id) as expense_cnt,
            AVG(ce.amount) as avg_amt,
            SUM(CASE WHEN ce.status = 'paid' THEN ce.amount ELSE 0 END) as paid_amt,
            SUM(CASE WHEN ce.status IN ('pending', 'approved') THEN ce.amount ELSE 0 END) as pending_amt
        FROM campaign_expenses ce
        WHERE ce.campaign_id = p_campaign_id
        GROUP BY ce.expense_type
    )
    SELECT 
        es.expense_type,
        es.total_amt,
        es.expense_cnt::INTEGER,
        es.avg_amt,
        CASE WHEN cb.total_budget > 0 THEN 
            (es.total_amt / cb.total_budget * 100) 
        ELSE 0 END as percentage_of_budget,
        es.paid_amt,
        es.pending_amt
    FROM expense_summary es
    CROSS JOIN campaign_budget cb
    ORDER BY es.total_amt DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROI Trend Analysis
-- =============================================
CREATE OR REPLACE FUNCTION get_roi_trend_analysis(
    p_brand_id UUID DEFAULT NULL,
    p_distributor_id UUID DEFAULT NULL,
    p_period_months INTEGER DEFAULT 12,
    p_granularity VARCHAR DEFAULT 'monthly' -- monthly, quarterly
)
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    campaign_count INTEGER,
    total_spent DECIMAL,
    total_revenue DECIMAL,
    average_roi DECIMAL,
    average_roas DECIMAL,
    cumulative_roi DECIMAL
) AS $$
DECLARE
    date_trunc_format VARCHAR;
BEGIN
    -- Set the date truncation format based on granularity
    IF p_granularity = 'quarterly' THEN
        date_trunc_format := 'quarter';
    ELSE
        date_trunc_format := 'month';
    END IF;

    RETURN QUERY
    EXECUTE format('
    WITH period_data AS (
        SELECT 
            date_trunc(%L, c.start_date) as period_start,
            COUNT(c.id) as campaign_count,
            SUM(c.spent_budget) as total_spent,
            SUM(c.total_revenue) as total_revenue,
            AVG(c.actual_roi_percentage) as avg_roi,
            AVG(c.return_on_ad_spend) as avg_roas
        FROM marketing_campaigns c
        WHERE 
            c.start_date >= NOW() - INTERVAL %L
            AND ($1 IS NULL OR c.brand_id = $1)
            AND ($2 IS NULL OR c.distributor_id = $2)
            AND c.status IN (''active'', ''completed'')
        GROUP BY date_trunc(%L, c.start_date)
    ),
    period_ranges AS (
        SELECT 
            pd.*,
            pd.period_start + INTERVAL %L - INTERVAL ''1 day'' as period_end
        FROM period_data pd
    ),
    cumulative_data AS (
        SELECT 
            pr.*,
            SUM(pr.avg_roi) OVER (ORDER BY pr.period_start ROWS UNBOUNDED PRECEDING) / 
            COUNT(*) OVER (ORDER BY pr.period_start ROWS UNBOUNDED PRECEDING) as cumulative_roi
        FROM period_ranges pr
    )
    SELECT 
        cd.period_start,
        cd.period_end,
        cd.campaign_count::INTEGER,
        cd.total_spent,
        cd.total_revenue,
        cd.avg_roi,
        cd.avg_roas,
        cd.cumulative_roi
    FROM cumulative_data cd
    ORDER BY cd.period_start',
    date_trunc_format, 
    p_period_months || ' months',
    date_trunc_format,
    CASE WHEN p_granularity = 'quarterly' THEN '1 quarter' ELSE '1 month' END
    ) USING p_brand_id, p_distributor_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Budget Performance View
-- =============================================
CREATE OR REPLACE VIEW campaign_budget_performance AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.brand_id,
    c.distributor_id,
    c.total_budget,
    c.allocated_budget,
    c.spent_budget,
    c.remaining_budget,
    
    -- Budget utilization metrics
    CASE WHEN c.allocated_budget > 0 THEN 
        (c.spent_budget / c.allocated_budget * 100) 
    ELSE 0 END as budget_utilization_percentage,
    
    -- Budget efficiency metrics
    CASE WHEN c.spent_budget > 0 THEN 
        (c.total_revenue / c.spent_budget) 
    ELSE 0 END as revenue_per_dollar_spent,
    
    -- Budget status
    CASE 
        WHEN c.spent_budget > c.allocated_budget THEN 'over_budget'
        WHEN c.spent_budget >= (c.allocated_budget * 0.9) THEN 'near_budget_limit'
        WHEN c.spent_budget >= (c.allocated_budget * 0.5) THEN 'on_track'
        ELSE 'under_utilized'
    END as budget_status,
    
    -- Time-based metrics
    c.start_date,
    c.end_date,
    CASE 
        WHEN c.end_date < CURRENT_DATE THEN 'completed'
        WHEN c.start_date > CURRENT_DATE THEN 'not_started'
        ELSE 'active'
    END as campaign_phase,
    
    -- Days remaining
    CASE 
        WHEN c.end_date >= CURRENT_DATE THEN (c.end_date - CURRENT_DATE)
        ELSE 0
    END as days_remaining,
    
    -- Projected budget burn rate
    CASE 
        WHEN c.start_date <= CURRENT_DATE AND c.end_date >= CURRENT_DATE THEN
            CASE 
                WHEN (CURRENT_DATE - c.start_date) > 0 THEN
                    (c.spent_budget / (CURRENT_DATE - c.start_date + 1)) * 
                    (c.end_date - c.start_date + 1)
                ELSE c.allocated_budget
            END
        ELSE NULL
    END as projected_total_spend,
    
    c.status,
    c.created_at,
    c.updated_at

FROM marketing_campaigns c
WHERE c.status IN ('active', 'completed', 'paused');

-- =============================================
-- Campaign Performance Alerts Function
-- =============================================
CREATE OR REPLACE FUNCTION get_campaign_performance_alerts(
    p_brand_id UUID DEFAULT NULL,
    p_distributor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_name VARCHAR,
    alert_type VARCHAR,
    alert_severity VARCHAR,
    alert_message TEXT,
    metric_value DECIMAL,
    threshold_value DECIMAL,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH budget_alerts AS (
        SELECT 
            c.id,
            c.name,
            'budget_overrun' as alert_type,
            CASE 
                WHEN c.spent_budget > c.allocated_budget * 1.2 THEN 'critical'
                WHEN c.spent_budget > c.allocated_budget * 1.1 THEN 'warning'
                ELSE 'info'
            END as alert_severity,
            'Campaign has exceeded allocated budget by ' || 
            ROUND(((c.spent_budget - c.allocated_budget) / c.allocated_budget * 100), 2) || 
            '%' as alert_message,
            c.spent_budget as metric_value,
            c.allocated_budget as threshold_value,
            NOW() as created_at
        FROM marketing_campaigns c
        WHERE 
            (p_brand_id IS NULL OR c.brand_id = p_brand_id)
            AND (p_distributor_id IS NULL OR c.distributor_id = p_distributor_id)
            AND c.spent_budget > c.allocated_budget
            AND c.status = 'active'
    ),
    roi_alerts AS (
        SELECT 
            c.id,
            c.name,
            'poor_roi' as alert_type,
            CASE 
                WHEN c.actual_roi_percentage < -50 THEN 'critical'
                WHEN c.actual_roi_percentage < -20 THEN 'warning'
                ELSE 'info'
            END as alert_severity,
            'Campaign ROI is ' || ROUND(c.actual_roi_percentage, 2) || 
            '%, significantly below target' as alert_message,
            c.actual_roi_percentage as metric_value,
            c.target_roi_percentage as threshold_value,
            NOW() as created_at
        FROM marketing_campaigns c
        WHERE 
            (p_brand_id IS NULL OR c.brand_id = p_brand_id)
            AND (p_distributor_id IS NULL OR c.distributor_id = p_distributor_id)
            AND c.actual_roi_percentage < COALESCE(c.target_roi_percentage * 0.5, -10)
            AND c.status = 'active'
            AND c.spent_budget > 0
    ),
    timeline_alerts AS (
        SELECT 
            c.id,
            c.name,
            'timeline_concern' as alert_type,
            CASE 
                WHEN c.end_date < CURRENT_DATE THEN 'critical'
                WHEN c.end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
                ELSE 'info'
            END as alert_severity,
            CASE 
                WHEN c.end_date < CURRENT_DATE THEN 'Campaign has ended but status is still active'
                ELSE 'Campaign ending in ' || (c.end_date - CURRENT_DATE) || ' days'
            END as alert_message,
            EXTRACT(EPOCH FROM (CURRENT_DATE - c.end_date)) as metric_value,
            0 as threshold_value,
            NOW() as created_at
        FROM marketing_campaigns c
        WHERE 
            (p_brand_id IS NULL OR c.brand_id = p_brand_id)
            AND (p_distributor_id IS NULL OR c.distributor_id = p_distributor_id)
            AND c.status = 'active'
            AND c.end_date <= CURRENT_DATE + INTERVAL '7 days'
    )
    SELECT * FROM budget_alerts
    UNION ALL
    SELECT * FROM roi_alerts  
    UNION ALL
    SELECT * FROM timeline_alerts
    ORDER BY 
        CASE alert_severity 
            WHEN 'critical' THEN 1 
            WHEN 'warning' THEN 2 
            ELSE 3 
        END,
        created_at DESC;
END;
$$ LANGUAGE plpgsql;