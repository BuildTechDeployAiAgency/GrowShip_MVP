-- =============================================
-- FINANCIAL & A&P MANAGEMENT MODULE SCHEMA
-- Comprehensive Financial Management System
-- =============================================

-- Step 1: Create Budget Categories for Hierarchical Expense Management
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating budget categories table...'; 
END $$;

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Category Information
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Hierarchy Support
  parent_id UUID REFERENCES budget_categories(id),
  category_level INTEGER NOT NULL DEFAULT 1,
  full_path TEXT, -- e.g., "Marketing/Digital/Social Media"
  
  -- Category Classification
  category_type VARCHAR(50) NOT NULL CHECK (category_type IN (
    'operational', 'marketing', 'sales', 'administrative', 
    'research_development', 'manufacturing', 'logistics', 
    'personnel', 'technology', 'facilities', 'other'
  )),
  
  -- Financial Configuration
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approval_threshold NUMERIC(12,2),
  
  -- Multi-tenant Support
  brand_id UUID REFERENCES brands(id),
  is_global BOOLEAN NOT NULL DEFAULT FALSE, -- For system-wide categories
  
  -- Audit Fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT budget_categories_pkey PRIMARY KEY (id),
  CONSTRAINT budget_categories_brand_code_unique UNIQUE (brand_id, code),
  CONSTRAINT budget_categories_parent_check CHECK (id != parent_id)
);

-- Step 2: Create Financial Budgets Table
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating financial budgets table...'; 
END $$;

CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Budget Identification
  budget_name VARCHAR(255) NOT NULL,
  budget_code VARCHAR(100) UNIQUE,
  
  -- Organizational Hierarchy
  brand_id UUID NOT NULL REFERENCES brands(id),
  distributor_id UUID REFERENCES distributors(id),
  region_id UUID,
  country_code VARCHAR(3),
  
  -- Budget Categorization
  budget_category_id UUID NOT NULL REFERENCES budget_categories(id),
  department VARCHAR(100),
  cost_center VARCHAR(50),
  
  -- Period Management
  fiscal_year INTEGER NOT NULL,
  period_type VARCHAR(20) NOT NULL DEFAULT 'annual' CHECK (period_type IN (
    'annual', 'quarterly', 'monthly', 'weekly'
  )),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_number INTEGER, -- Q1, Q2, etc. or Month 1-12
  
  -- Budget Amounts (in base currency)
  planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  committed_amount NUMERIC(12,2) NOT NULL DEFAULT 0, -- Purchase orders, etc.
  remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
  
  -- Variance Tracking
  variance_amount NUMERIC(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
  variance_percentage NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN allocated_amount = 0 THEN 0 
         ELSE ((allocated_amount - spent_amount) / allocated_amount * 100) 
    END
  ) STORED,
  
  -- Currency and Exchange
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(10,6) DEFAULT 1.0,
  base_currency_amount NUMERIC(12,2) GENERATED ALWAYS AS (allocated_amount * exchange_rate) STORED,
  
  -- Approval and Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'active', 'locked', 
    'cancelled', 'expired', 'under_review'
  )),
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected', 'requires_revision'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Budget Revision Tracking
  version_number INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES financial_budgets(id),
  revision_reason TEXT,
  
  -- Budget Alerts Configuration
  alert_threshold_percentage NUMERIC(5,2) DEFAULT 80.00, -- Alert at 80% spend
  critical_threshold_percentage NUMERIC(5,2) DEFAULT 95.00, -- Critical alert at 95%
  
  -- Additional Configuration
  is_rollover_budget BOOLEAN NOT NULL DEFAULT FALSE, -- Carries over from previous period
  rollover_from_budget_id UUID REFERENCES financial_budgets(id),
  auto_allocate BOOLEAN NOT NULL DEFAULT FALSE, -- Auto-allocate based on actuals
  
  -- Notes and Documentation
  notes TEXT,
  budget_justification TEXT,
  tags TEXT[],
  
  -- Audit Fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT financial_budgets_pkey PRIMARY KEY (id),
  CONSTRAINT financial_budgets_date_check CHECK (period_end_date >= period_start_date),
  CONSTRAINT financial_budgets_amount_check CHECK (planned_amount >= 0 AND allocated_amount >= 0 AND spent_amount >= 0),
  CONSTRAINT financial_budgets_allocation_check CHECK (allocated_amount <= planned_amount * 1.1), -- Allow 10% over-allocation
  CONSTRAINT financial_budgets_brand_category_period UNIQUE (brand_id, budget_category_id, fiscal_year, period_type, period_number)
);

-- Step 3: Create Budget Allocations for Department/Region Distribution
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating budget allocations table...'; 
END $$;

CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Reference to Parent Budget
  financial_budget_id UUID NOT NULL REFERENCES financial_budgets(id) ON DELETE CASCADE,
  
  -- Allocation Target
  allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN (
    'department', 'region', 'distributor', 'campaign', 'product_line', 
    'sales_channel', 'cost_center', 'project', 'employee'
  )),
  target_id UUID, -- Generic reference to department/region/etc.
  target_name VARCHAR(255) NOT NULL,
  
  -- Allocation Amounts
  allocated_percentage NUMERIC(5,2) CHECK (allocated_percentage >= 0 AND allocated_percentage <= 100),
  allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount >= 0),
  
  -- Spending Tracking
  spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  committed_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS (allocated_amount - spent_amount - committed_amount) STORED,
  
  -- Status and Control
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'suspended', 'exhausted', 'cancelled'
  )),
  
  -- Date Range (can override parent budget dates)
  effective_start_date DATE,
  effective_end_date DATE,
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  allocation_notes TEXT,
  
  -- Audit Fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT budget_allocations_pkey PRIMARY KEY (id),
  CONSTRAINT budget_allocations_amount_check CHECK (allocated_amount > 0),
  CONSTRAINT budget_allocations_date_check CHECK (
    effective_end_date IS NULL OR effective_start_date IS NULL OR 
    effective_end_date >= effective_start_date
  )
);

-- Step 4: Create Operational Expenses Table for Non-Marketing Expenses
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating operational expenses table...'; 
END $$;

CREATE TABLE IF NOT EXISTS public.operational_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Basic Expense Information
  expense_number VARCHAR(100) UNIQUE,
  description TEXT NOT NULL,
  
  -- Organizational Context
  brand_id UUID NOT NULL REFERENCES brands(id),
  distributor_id UUID REFERENCES distributors(id),
  region_id UUID,
  department VARCHAR(100),
  cost_center VARCHAR(50),
  
  -- Budget Allocation
  budget_allocation_id UUID REFERENCES budget_allocations(id),
  budget_category_id UUID NOT NULL REFERENCES budget_categories(id),
  
  -- Expense Classification
  expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN (
    'logistics', 'warehousing', 'personnel', 'technology', 'facilities',
    'professional_services', 'travel', 'training', 'utilities', 
    'insurance', 'equipment', 'supplies', 'maintenance', 'other'
  )),
  expense_subcategory VARCHAR(100),
  
  -- Financial Details
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount > 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) GENERATED ALWAYS AS (gross_amount + tax_amount - discount_amount) STORED,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Exchange Rate (for multi-currency)
  exchange_rate NUMERIC(10,6) DEFAULT 1.0,
  base_currency_amount NUMERIC(12,2) GENERATED ALWAYS AS ((gross_amount + tax_amount - discount_amount) * exchange_rate) STORED,
  
  -- Timing
  expense_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  period_start_date DATE, -- For recurring expenses
  period_end_date DATE,
  
  -- Vendor/Supplier Information
  vendor_id UUID, -- Could reference suppliers/vendors table
  vendor_name VARCHAR(255),
  vendor_contact VARCHAR(255),
  invoice_number VARCHAR(100),
  purchase_order_number VARCHAR(100),
  
  -- Payment Information
  payment_method VARCHAR(50) CHECK (payment_method IN (
    'bank_transfer', 'check', 'credit_card', 'wire_transfer', 'ach', 'cash', 'other'
  )),
  payment_reference VARCHAR(100),
  bank_reference VARCHAR(100),
  
  -- Status and Approval
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'pending_payment', 
    'paid', 'overdue', 'cancelled', 'disputed', 'rejected'
  )),
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected', 'requires_revision'
  )),
  
  -- Approval Workflow
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES auth.users(id),
  
  -- Recurring Expense Configuration
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_pattern VARCHAR(50) CHECK (recurrence_pattern IN (
    'monthly', 'quarterly', 'semi_annual', 'annual', 'weekly', 'bi_weekly', 'custom'
  )),
  next_occurrence_date DATE,
  
  -- Allocation and Distribution
  allocation_percentage NUMERIC(5,2) DEFAULT 100.00,
  is_allocatable BOOLEAN NOT NULL DEFAULT TRUE,
  allocation_basis VARCHAR(50) CHECK (allocation_basis IN (
    'equal', 'revenue_based', 'headcount_based', 'area_based', 'custom'
  )),
  
  -- Document Attachments
  receipt_url TEXT,
  invoice_url TEXT,
  purchase_order_url TEXT,
  supporting_documents TEXT[], -- Array of document URLs
  
  -- Additional Classification
  is_capital_expense BOOLEAN NOT NULL DEFAULT FALSE,
  asset_class VARCHAR(100), -- For capital expenses
  depreciation_method VARCHAR(50),
  useful_life_years INTEGER,
  
  -- Tax and Compliance
  tax_category VARCHAR(50),
  is_tax_deductible BOOLEAN NOT NULL DEFAULT TRUE,
  tax_code VARCHAR(20),
  
  -- Project/Campaign Association
  project_id UUID,
  campaign_id UUID REFERENCES marketing_campaigns(id), -- For shared expenses
  
  -- Notes and Comments
  internal_notes TEXT,
  vendor_notes TEXT,
  approval_comments TEXT,
  tags TEXT[],
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT operational_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT operational_expenses_date_check CHECK (
    due_date IS NULL OR expense_date <= due_date
  ),
  CONSTRAINT operational_expenses_paid_date_check CHECK (
    paid_date IS NULL OR paid_date >= expense_date
  ),
  CONSTRAINT operational_expenses_allocation_check CHECK (
    allocation_percentage >= 0 AND allocation_percentage <= 100
  )
);

-- Step 5: Create Expense Approvals Workflow Table
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating expense approvals table...'; 
END $$;

CREATE TABLE IF NOT EXISTS public.expense_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Reference to Expense
  expense_id UUID NOT NULL REFERENCES operational_expenses(id) ON DELETE CASCADE,
  expense_type VARCHAR(50) NOT NULL DEFAULT 'operational', -- 'operational' or 'marketing'
  
  -- Approval Level Configuration
  approval_level INTEGER NOT NULL CHECK (approval_level > 0),
  approver_role VARCHAR(50) NOT NULL,
  approver_user_id UUID REFERENCES auth.users(id),
  
  -- Approval Thresholds
  min_amount NUMERIC(12,2),
  max_amount NUMERIC(12,2),
  
  -- Approval Decision
  approval_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected', 'delegated', 'escalated'
  )),
  
  -- Approval Details
  approved_amount NUMERIC(12,2),
  approval_date TIMESTAMP WITH TIME ZONE,
  approval_comments TEXT,
  rejection_reason TEXT,
  
  -- Delegation/Escalation
  delegated_to UUID REFERENCES auth.users(id),
  escalated_to UUID REFERENCES auth.users(id),
  escalation_reason TEXT,
  
  -- Timing
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Sequence Control
  is_final_approval BOOLEAN NOT NULL DEFAULT FALSE,
  next_approver_id UUID REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT expense_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT expense_approvals_amount_check CHECK (
    min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount
  ),
  CONSTRAINT expense_approvals_level_unique UNIQUE (expense_id, approval_level)
);

-- Step 6: Create Financial Periods for Flexible Period Management
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating financial periods table...'; 
END $$;

CREATE TABLE IF NOT EXISTS public.financial_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Period Identification
  period_name VARCHAR(100) NOT NULL,
  period_code VARCHAR(20) NOT NULL,
  
  -- Period Classification
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN (
    'fiscal_year', 'calendar_year', 'quarter', 'month', 'week', 'custom'
  )),
  fiscal_year INTEGER NOT NULL,
  calendar_year INTEGER NOT NULL,
  
  -- Date Range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Hierarchy (for quarters within years, etc.)
  parent_period_id UUID REFERENCES financial_periods(id),
  period_sequence INTEGER, -- 1, 2, 3, 4 for quarters
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN (
    'future', 'open', 'closed', 'locked', 'archived'
  )),
  closed_date TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id),
  
  -- Organization
  brand_id UUID REFERENCES brands(id),
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT financial_periods_pkey PRIMARY KEY (id),
  CONSTRAINT financial_periods_date_check CHECK (end_date > start_date),
  CONSTRAINT financial_periods_brand_code_unique UNIQUE (brand_id, period_code, fiscal_year),
  CONSTRAINT financial_periods_parent_check CHECK (id != parent_period_id)
);

-- Step 7: Create Utility Functions
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating utility functions...'; 
END $$;

-- Function to generate budget codes
CREATE OR REPLACE FUNCTION generate_budget_code(
  budget_name TEXT,
  fiscal_year INTEGER,
  period_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 1;
BEGIN
  -- Create base code from budget name
  base_code := UPPER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(budget_name, '[^a-zA-Z0-9]', '_', 'g'),
      '_{2,}', '_', 'g'
    )
  );
  
  -- Limit to 20 characters and add fiscal year
  base_code := SUBSTRING(base_code, 1, 15) || '_' || fiscal_year::TEXT;
  
  -- Add period type suffix
  base_code := base_code || '_' || SUBSTRING(period_type, 1, 1);
  
  -- Ensure uniqueness
  final_code := base_code;
  WHILE EXISTS (SELECT 1 FROM financial_budgets WHERE budget_code = final_code) LOOP
    final_code := base_code || '_' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate budget utilization
CREATE OR REPLACE FUNCTION calculate_budget_utilization(
  budget_id UUID
)
RETURNS TABLE (
  utilization_percentage NUMERIC,
  variance_amount NUMERIC,
  variance_percentage NUMERIC,
  is_over_budget BOOLEAN,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN allocated_amount = 0 THEN 0 
         ELSE (spent_amount / allocated_amount * 100) 
    END as utilization_percentage,
    (allocated_amount - spent_amount) as variance_amount,
    CASE WHEN allocated_amount = 0 THEN 0 
         ELSE ((allocated_amount - spent_amount) / allocated_amount * 100) 
    END as variance_percentage,
    (spent_amount > allocated_amount) as is_over_budget,
    GREATEST(0, (period_end_date - CURRENT_DATE)::INTEGER) as days_remaining
  FROM financial_budgets
  WHERE id = budget_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create Indexes for Performance
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating performance indexes...'; 
END $$;

-- Budget Categories Indexes
CREATE INDEX IF NOT EXISTS idx_budget_categories_brand_id ON budget_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_parent_id ON budget_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_type ON budget_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_budget_categories_active ON budget_categories(is_active);

-- Financial Budgets Indexes
CREATE INDEX IF NOT EXISTS idx_financial_budgets_brand_id ON financial_budgets(brand_id);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_distributor_id ON financial_budgets(distributor_id);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_category_id ON financial_budgets(budget_category_id);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_fiscal_year ON financial_budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_period_dates ON financial_budgets(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_status ON financial_budgets(status);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_period_type ON financial_budgets(period_type);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_brand_year_period ON financial_budgets(brand_id, fiscal_year, period_type);

-- Budget Allocations Indexes
CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget_id ON budget_allocations(financial_budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_type_target ON budget_allocations(allocation_type, target_id);
CREATE INDEX IF NOT EXISTS idx_budget_allocations_status ON budget_allocations(status);

-- Operational Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_operational_expenses_brand_id ON operational_expenses(brand_id);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_distributor_id ON operational_expenses(distributor_id);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_category_id ON operational_expenses(budget_category_id);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_allocation_id ON operational_expenses(budget_allocation_id);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_type ON operational_expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_status ON operational_expenses(status);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_dates ON operational_expenses(expense_date, due_date);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_vendor ON operational_expenses(vendor_name);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_amount ON operational_expenses(net_amount);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_brand_period ON operational_expenses(brand_id, expense_date);

-- Expense Approvals Indexes
CREATE INDEX IF NOT EXISTS idx_expense_approvals_expense_id ON expense_approvals(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_approver ON expense_approvals(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_status ON expense_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_expense_approvals_level ON expense_approvals(approval_level);

-- Financial Periods Indexes
CREATE INDEX IF NOT EXISTS idx_financial_periods_brand_id ON financial_periods(brand_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_fiscal_year ON financial_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_financial_periods_dates ON financial_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_periods_status ON financial_periods(status);
CREATE INDEX IF NOT EXISTS idx_financial_periods_parent ON financial_periods(parent_period_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_financial_budgets_name_search ON financial_budgets USING gin(to_tsvector('english', budget_name));
CREATE INDEX IF NOT EXISTS idx_operational_expenses_desc_search ON operational_expenses USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_budget_categories_name_search ON budget_categories USING gin(to_tsvector('english', name));

-- Step 9: Create Triggers for Automatic Updates
DO $$ 
BEGIN 
    RAISE NOTICE 'Creating triggers...'; 
END $$;

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DROP TRIGGER IF EXISTS trigger_budget_categories_updated_at ON budget_categories;
CREATE TRIGGER trigger_budget_categories_updated_at
  BEFORE UPDATE ON budget_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_financial_budgets_updated_at ON financial_budgets;
CREATE TRIGGER trigger_financial_budgets_updated_at
  BEFORE UPDATE ON financial_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_budget_allocations_updated_at ON budget_allocations;
CREATE TRIGGER trigger_budget_allocations_updated_at
  BEFORE UPDATE ON budget_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_operational_expenses_updated_at ON operational_expenses;
CREATE TRIGGER trigger_operational_expenses_updated_at
  BEFORE UPDATE ON operational_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_expense_approvals_updated_at ON expense_approvals;
CREATE TRIGGER trigger_expense_approvals_updated_at
  BEFORE UPDATE ON expense_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_financial_periods_updated_at ON financial_periods;
CREATE TRIGGER trigger_financial_periods_updated_at
  BEFORE UPDATE ON financial_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Budget code generation trigger
CREATE OR REPLACE FUNCTION generate_budget_code_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.budget_code IS NULL OR NEW.budget_code = '' THEN
    NEW.budget_code := generate_budget_code(NEW.budget_name, NEW.fiscal_year, NEW.period_type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_budget_code ON financial_budgets;
CREATE TRIGGER trigger_generate_budget_code
  BEFORE INSERT OR UPDATE ON financial_budgets
  FOR EACH ROW EXECUTE FUNCTION generate_budget_code_trigger();

-- Expense number generation trigger
CREATE OR REPLACE FUNCTION generate_expense_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
    NEW.expense_number := 'EXP-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('expense_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for expense numbers
CREATE SEQUENCE IF NOT EXISTS expense_number_seq START 1;

DROP TRIGGER IF EXISTS trigger_generate_expense_number ON operational_expenses;
CREATE TRIGGER trigger_generate_expense_number
  BEFORE INSERT ON operational_expenses
  FOR EACH ROW EXECUTE FUNCTION generate_expense_number_trigger();

-- Step 10: Success Message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINANCIAL MANAGEMENT SCHEMA CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- budget_categories (expense categorization)';
    RAISE NOTICE '- financial_budgets (comprehensive budget management)';
    RAISE NOTICE '- budget_allocations (department/region distribution)';
    RAISE NOTICE '- operational_expenses (non-marketing expenses)';
    RAISE NOTICE '- expense_approvals (approval workflow)';
    RAISE NOTICE '- financial_periods (period management)';
    RAISE NOTICE '';
    RAISE NOTICE 'Features implemented:';
    RAISE NOTICE '- Multi-tenant data isolation';
    RAISE NOTICE '- Hierarchical budget categories';
    RAISE NOTICE '- Flexible period management';
    RAISE NOTICE '- Comprehensive expense tracking';
    RAISE NOTICE '- Approval workflows';
    RAISE NOTICE '- Automatic code generation';
    RAISE NOTICE '- Performance indexes';
    RAISE NOTICE '- Full audit trails';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Ready for RLS policies implementation...';
    RAISE NOTICE '========================================';
END $$;