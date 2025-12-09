-- Migration: Marketing Campaign System
-- Description: Creates comprehensive marketing campaign tracking with ROI calculation
-- Date: 2025-12-09

-- =============================================
-- Marketing Campaigns Table
-- =============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic campaign information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_code VARCHAR(50) UNIQUE,
    
    -- Campaign hierarchy and ownership
    brand_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES distributors(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id),
    country_code VARCHAR(2),
    
    -- Campaign categorization
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
        'brand_awareness', 'product_launch', 'seasonal', 'promotional', 
        'digital_marketing', 'trade_show', 'print_advertising', 'content_marketing',
        'social_media', 'email_marketing', 'influencer', 'partnership'
    )),
    channel VARCHAR(50) NOT NULL CHECK (channel IN (
        'digital', 'print', 'radio', 'tv', 'outdoor', 'social_media',
        'email', 'content', 'events', 'partnerships', 'direct_mail'
    )),
    target_audience VARCHAR(100),
    
    -- Budget and financial tracking
    total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    allocated_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    spent_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    remaining_budget DECIMAL(12,2) GENERATED ALWAYS AS (allocated_budget - spent_budget) STORED,
    
    -- Fund allocation (for distributor campaigns)
    fund_source VARCHAR(50) CHECK (fund_source IN ('brand_direct', 'mdf', 'coop', 'distributor_self', 'shared')),
    brand_contribution DECIMAL(12,2) DEFAULT 0,
    distributor_contribution DECIMAL(12,2) DEFAULT 0,
    
    -- Campaign timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    launch_date DATE,
    
    -- Campaign status and lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'active', 'paused', 
        'completed', 'cancelled', 'under_review'
    )),
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'approved', 'rejected', 'requires_revision'
    )),
    
    -- Performance targets
    target_reach INTEGER,
    target_impressions INTEGER,
    target_leads INTEGER,
    target_sales_amount DECIMAL(12,2),
    target_roi_percentage DECIMAL(5,2),
    
    -- Actual performance metrics
    actual_reach INTEGER DEFAULT 0,
    actual_impressions INTEGER DEFAULT 0,
    actual_leads INTEGER DEFAULT 0,
    actual_sales_amount DECIMAL(12,2) DEFAULT 0,
    actual_roi_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- ROI calculations
    total_revenue DECIMAL(12,2) DEFAULT 0,
    attributed_orders INTEGER DEFAULT 0,
    cost_per_acquisition DECIMAL(10,2),
    return_on_ad_spend DECIMAL(8,4),
    
    -- Approval and tracking
    created_by UUID REFERENCES user_profiles(user_id),
    approved_by UUID REFERENCES user_profiles(user_id),
    approved_at TIMESTAMP,
    
    -- Metadata
    tags TEXT[], -- For flexible categorization
    external_campaign_id VARCHAR(100), -- For integration with external platforms
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_budget_allocation CHECK (allocated_budget <= total_budget),
    CONSTRAINT valid_contributions CHECK (brand_contribution + distributor_contribution <= total_budget)
);

-- =============================================
-- Campaign Expenses Table
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    -- Expense details
    expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN (
        'advertising', 'content_creation', 'design', 'media_buy', 'events', 
        'materials', 'personnel', 'technology', 'analytics', 'other'
    )),
    subcategory VARCHAR(100),
    description TEXT NOT NULL,
    
    -- Financial details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Expense timing and approval
    expense_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    
    -- Vendor and payment information
    vendor_name VARCHAR(200),
    vendor_contact VARCHAR(255),
    invoice_number VARCHAR(100),
    payment_method VARCHAR(50),
    
    -- Approval workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'paid', 'overdue', 'cancelled'
    )),
    approved_by UUID REFERENCES user_profiles(user_id),
    approved_at TIMESTAMP,
    
    -- Expense categorization
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(20), -- weekly, monthly, quarterly
    allocation_percentage DECIMAL(5,2) DEFAULT 100, -- For shared expenses
    
    -- File attachments
    receipt_url TEXT,
    invoice_url TEXT,
    supporting_docs TEXT[], -- Array of document URLs
    
    -- Tracking
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- Campaign Performance Metrics Table
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    
    -- Metric details
    metric_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- impressions, clicks, leads, sales, etc.
    
    -- Data source
    data_source VARCHAR(100), -- google_ads, facebook, manual_entry, etc.
    external_id VARCHAR(255),
    
    -- Additional context
    notes TEXT,
    verified_by UUID REFERENCES user_profiles(user_id),
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint for daily metrics per campaign
    UNIQUE(campaign_id, metric_date, metric_type, data_source)
);

-- =============================================
-- Campaign Orders Link Table
-- =============================================
CREATE TABLE IF NOT EXISTS campaign_order_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Attribution details
    attribution_type VARCHAR(50) NOT NULL CHECK (attribution_type IN (
        'direct', 'influenced', 'assisted', 'last_touch', 'first_touch', 'multi_touch'
    )),
    attribution_weight DECIMAL(3,2) DEFAULT 1.00, -- For multi-touch attribution
    attribution_date TIMESTAMP DEFAULT NOW(),
    
    -- Order value attribution
    attributed_revenue DECIMAL(12,2) NOT NULL,
    attributed_margin DECIMAL(12,2),
    
    -- Tracking source
    tracking_code VARCHAR(100),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Manual or automated attribution
    attribution_method VARCHAR(50) DEFAULT 'manual' CHECK (attribution_method IN ('manual', 'automated', 'hybrid')),
    verified_by UUID REFERENCES user_profiles(user_id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate attributions
    UNIQUE(campaign_id, order_id, attribution_type)
);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX idx_campaigns_brand_id ON marketing_campaigns(brand_id);
CREATE INDEX idx_campaigns_distributor_id ON marketing_campaigns(distributor_id);
CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_campaigns_date_range ON marketing_campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_type_channel ON marketing_campaigns(campaign_type, channel);

CREATE INDEX idx_expenses_campaign_id ON campaign_expenses(campaign_id);
CREATE INDEX idx_expenses_date ON campaign_expenses(expense_date);
CREATE INDEX idx_expenses_status ON campaign_expenses(status);

CREATE INDEX idx_performance_campaign_date ON campaign_performance_metrics(campaign_id, metric_date);
CREATE INDEX idx_performance_metric_type ON campaign_performance_metrics(metric_type);

CREATE INDEX idx_attribution_campaign_id ON campaign_order_attribution(campaign_id);
CREATE INDEX idx_attribution_order_id ON campaign_order_attribution(order_id);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_order_attribution ENABLE ROW LEVEL SECURITY;

-- Campaigns access policies
CREATE POLICY "Users can view campaigns in their organization" ON marketing_campaigns
    FOR SELECT USING (
        brand_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
        OR 
        distributor_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Brand admins can manage all campaigns" ON marketing_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND organization_id = brand_id 
            AND role_name IN ('brand_admin', 'brand_manager')
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role_name = 'super_admin'
        )
    );

CREATE POLICY "Distributors can manage their campaigns" ON marketing_campaigns
    FOR ALL USING (
        distributor_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Campaign expenses policies (inherit from campaigns)
CREATE POLICY "Users can view expenses for accessible campaigns" ON campaign_expenses
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns 
            WHERE brand_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            ) OR distributor_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage expenses for their campaigns" ON campaign_expenses
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns 
            WHERE (brand_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid() 
                AND role_name IN ('brand_admin', 'brand_manager')
            )) OR (distributor_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )) OR EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() AND role_name = 'super_admin'
            )
        )
    );

-- Performance metrics policies
CREATE POLICY "Users can view metrics for accessible campaigns" ON campaign_performance_metrics
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns 
            WHERE brand_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            ) OR distributor_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage metrics for their campaigns" ON campaign_performance_metrics
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns 
            WHERE (brand_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )) OR (distributor_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )) OR EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() AND role_name = 'super_admin'
            )
        )
    );

-- Order attribution policies
CREATE POLICY "Users can view attribution for accessible campaigns" ON campaign_order_attribution
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns 
            WHERE brand_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            ) OR distributor_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage attribution for their campaigns" ON campaign_order_attribution
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM marketing_campaigns 
            WHERE (brand_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )) OR (distributor_id IN (
                SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
            )) OR EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_id = auth.uid() AND role_name = 'super_admin'
            )
        )
    );

-- =============================================
-- Automatic Triggers
-- =============================================

-- Update campaign metrics when expenses change
CREATE OR REPLACE FUNCTION update_campaign_spent_budget()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE marketing_campaigns 
        SET spent_budget = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM campaign_expenses 
            WHERE campaign_id = NEW.campaign_id 
            AND status IN ('approved', 'paid')
        ),
        updated_at = NOW()
        WHERE id = NEW.campaign_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE marketing_campaigns 
        SET spent_budget = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM campaign_expenses 
            WHERE campaign_id = OLD.campaign_id 
            AND status IN ('approved', 'paid')
        ),
        updated_at = NOW()
        WHERE id = OLD.campaign_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_spent_budget
    AFTER INSERT OR UPDATE OR DELETE ON campaign_expenses
    FOR EACH ROW EXECUTE FUNCTION update_campaign_spent_budget();

-- Update campaign revenue when order attribution changes
CREATE OR REPLACE FUNCTION update_campaign_revenue()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE marketing_campaigns 
        SET 
            total_revenue = (
                SELECT COALESCE(SUM(attributed_revenue), 0) 
                FROM campaign_order_attribution 
                WHERE campaign_id = NEW.campaign_id
            ),
            attributed_orders = (
                SELECT COUNT(DISTINCT order_id) 
                FROM campaign_order_attribution 
                WHERE campaign_id = NEW.campaign_id
            ),
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
        
        -- Calculate ROI if we have both revenue and spent budget
        UPDATE marketing_campaigns 
        SET 
            actual_roi_percentage = CASE 
                WHEN spent_budget > 0 THEN 
                    ((total_revenue - spent_budget) / spent_budget * 100)
                ELSE 0 
            END,
            return_on_ad_spend = CASE 
                WHEN spent_budget > 0 THEN 
                    (total_revenue / spent_budget)
                ELSE 0 
            END,
            cost_per_acquisition = CASE 
                WHEN attributed_orders > 0 THEN 
                    (spent_budget / attributed_orders)
                ELSE 0 
            END
        WHERE id = NEW.campaign_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE marketing_campaigns 
        SET 
            total_revenue = (
                SELECT COALESCE(SUM(attributed_revenue), 0) 
                FROM campaign_order_attribution 
                WHERE campaign_id = OLD.campaign_id
            ),
            attributed_orders = (
                SELECT COUNT(DISTINCT order_id) 
                FROM campaign_order_attribution 
                WHERE campaign_id = OLD.campaign_id
            ),
            updated_at = NOW()
        WHERE id = OLD.campaign_id;
        
        -- Recalculate ROI
        UPDATE marketing_campaigns 
        SET 
            actual_roi_percentage = CASE 
                WHEN spent_budget > 0 THEN 
                    ((total_revenue - spent_budget) / spent_budget * 100)
                ELSE 0 
            END,
            return_on_ad_spend = CASE 
                WHEN spent_budget > 0 THEN 
                    (total_revenue / spent_budget)
                ELSE 0 
            END,
            cost_per_acquisition = CASE 
                WHEN attributed_orders > 0 THEN 
                    (spent_budget / attributed_orders)
                ELSE 0 
            END
        WHERE id = OLD.campaign_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_revenue
    AFTER INSERT OR UPDATE OR DELETE ON campaign_order_attribution
    FOR EACH ROW EXECUTE FUNCTION update_campaign_revenue();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_timestamp
    BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_expenses_timestamp
    BEFORE UPDATE ON campaign_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();