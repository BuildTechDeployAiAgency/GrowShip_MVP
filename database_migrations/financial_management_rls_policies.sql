-- =============================================
-- FINANCIAL MANAGEMENT MODULE - RLS POLICIES
-- Row Level Security for Financial & A&P Management Tables
-- =============================================

-- Enable RLS on all financial tables
DO $$ 
BEGIN 
    RAISE NOTICE 'Enabling Row Level Security on financial management tables...'; 
END $$;

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BUDGET CATEGORIES RLS POLICIES
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating RLS policies for budget_categories...'; 
END $$;

-- SELECT Policy: Users can view categories for their brand or global categories
DROP POLICY IF EXISTS "Users can view budget categories for their brand" ON public.budget_categories;
CREATE POLICY "Users can view budget categories for their brand" 
ON public.budget_categories FOR SELECT 
USING (
  -- Super admin can see all
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Global categories visible to all authenticated users
  is_global = TRUE
  OR
  -- Brand-specific categories visible to brand users
  (
    brand_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.brand_id = budget_categories.brand_id
      AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_finance', 'brand_user')
    )
  )
);

-- INSERT Policy: Only admins can create categories
DROP POLICY IF EXISTS "Users can create budget categories based on role" ON public.budget_categories;
CREATE POLICY "Users can create budget categories based on role" 
ON public.budget_categories FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = budget_categories.brand_id)
    )
  )
);

-- UPDATE Policy: Only admins can update categories
DROP POLICY IF EXISTS "Users can update budget categories based on role" ON public.budget_categories;
CREATE POLICY "Users can update budget categories based on role" 
ON public.budget_categories FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = budget_categories.brand_id)
    )
  )
);

-- DELETE Policy: Only super admin and brand admin can delete
DROP POLICY IF EXISTS "Users can delete budget categories based on role" ON public.budget_categories;
CREATE POLICY "Users can delete budget categories based on role" 
ON public.budget_categories FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name = 'brand_admin' AND up.brand_id = budget_categories.brand_id)
    )
  )
);

-- =============================================
-- FINANCIAL BUDGETS RLS POLICIES
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating RLS policies for financial_budgets...'; 
END $$;

-- SELECT Policy: Users can view budgets based on their role and organization
DROP POLICY IF EXISTS "Users can view budgets based on their role and organization" ON public.financial_budgets;
CREATE POLICY "Users can view budgets based on their role and organization" 
ON public.financial_budgets FOR SELECT 
USING (
  -- Super admin can see all budgets
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand users can see budgets for their brand
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = financial_budgets.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_finance', 'brand_user')
  )
  OR
  -- Distributor users can see budgets assigned to them
  (
    financial_budgets.distributor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.distributor_id = financial_budgets.distributor_id
      AND up.role_name IN ('distributor_admin', 'distributor_manager', 'distributor_finance', 'distributor_user')
    )
  )
);

-- INSERT Policy: Finance managers and admins can create budgets
DROP POLICY IF EXISTS "Users can create budgets based on their role" ON public.financial_budgets;
CREATE POLICY "Users can create budgets based on their role" 
ON public.financial_budgets FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = financial_budgets.brand_id)
      OR
      (up.role_name IN ('distributor_admin', 'distributor_finance') AND up.distributor_id = financial_budgets.distributor_id)
    )
  )
);

-- UPDATE Policy: Admins, finance roles, and budget creators can update
DROP POLICY IF EXISTS "Users can update budgets based on their role" ON public.financial_budgets;
CREATE POLICY "Users can update budgets based on their role" 
ON public.financial_budgets FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = financial_budgets.brand_id)
      OR
      (up.role_name IN ('distributor_admin', 'distributor_finance') AND up.distributor_id = financial_budgets.distributor_id)
    )
  )
  OR
  financial_budgets.created_by = auth.uid()
);

-- DELETE Policy: Only admins can delete budgets
DROP POLICY IF EXISTS "Users can delete budgets based on their role" ON public.financial_budgets;
CREATE POLICY "Users can delete budgets based on their role" 
ON public.financial_budgets FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      up.role_name = 'brand_admin' AND up.brand_id = financial_budgets.brand_id
    )
  )
);

-- =============================================
-- BUDGET ALLOCATIONS RLS POLICIES
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating RLS policies for budget_allocations...'; 
END $$;

-- SELECT Policy: Users can view allocations for budgets they have access to
DROP POLICY IF EXISTS "Users can view budget allocations based on budget access" ON public.budget_allocations;
CREATE POLICY "Users can view budget allocations based on budget access" 
ON public.budget_allocations FOR SELECT 
USING (
  -- Super admin can see all allocations
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Users can see allocations for budgets they have access to
  EXISTS (
    SELECT 1 FROM financial_budgets fb
    JOIN user_profiles up ON (up.user_id = auth.uid())
    WHERE fb.id = budget_allocations.financial_budget_id
    AND (
      (up.brand_id = fb.brand_id AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_finance', 'brand_user'))
      OR
      (up.distributor_id = fb.distributor_id AND up.role_name IN ('distributor_admin', 'distributor_manager', 'distributor_finance', 'distributor_user'))
    )
  )
);

-- INSERT Policy: Finance roles can create allocations
DROP POLICY IF EXISTS "Users can create budget allocations based on role" ON public.budget_allocations;
CREATE POLICY "Users can create budget allocations based on role" 
ON public.budget_allocations FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM financial_budgets fb
    JOIN user_profiles up ON (up.user_id = auth.uid())
    WHERE fb.id = budget_allocations.financial_budget_id
    AND (
      up.role_name = 'super_admin'
      OR
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = fb.brand_id)
      OR
      (up.role_name IN ('distributor_admin', 'distributor_finance') AND up.distributor_id = fb.distributor_id)
    )
  )
);

-- UPDATE Policy: Finance roles and creators can update allocations
DROP POLICY IF EXISTS "Users can update budget allocations based on role" ON public.budget_allocations;
CREATE POLICY "Users can update budget allocations based on role" 
ON public.budget_allocations FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM financial_budgets fb
    JOIN user_profiles up ON (up.user_id = auth.uid())
    WHERE fb.id = budget_allocations.financial_budget_id
    AND (
      up.role_name = 'super_admin'
      OR
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = fb.brand_id)
      OR
      (up.role_name IN ('distributor_admin', 'distributor_finance') AND up.distributor_id = fb.distributor_id)
    )
  )
  OR
  budget_allocations.created_by = auth.uid()
);

-- DELETE Policy: Admins and finance roles can delete allocations
DROP POLICY IF EXISTS "Users can delete budget allocations based on role" ON public.budget_allocations;
CREATE POLICY "Users can delete budget allocations based on role" 
ON public.budget_allocations FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM financial_budgets fb
    JOIN user_profiles up ON (up.user_id = auth.uid())
    WHERE fb.id = budget_allocations.financial_budget_id
    AND (
      up.role_name = 'super_admin'
      OR
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = fb.brand_id)
      OR
      (up.role_name = 'distributor_admin' AND up.distributor_id = fb.distributor_id)
    )
  )
);

-- =============================================
-- OPERATIONAL EXPENSES RLS POLICIES
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating RLS policies for operational_expenses...'; 
END $$;

-- SELECT Policy: Users can view expenses based on their organization
DROP POLICY IF EXISTS "Users can view operational expenses based on organization" ON public.operational_expenses;
CREATE POLICY "Users can view operational expenses based on organization" 
ON public.operational_expenses FOR SELECT 
USING (
  -- Super admin can see all expenses
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand users can see expenses for their brand
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.brand_id = operational_expenses.brand_id
    AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_finance', 'brand_user')
  )
  OR
  -- Distributor users can see expenses assigned to them
  (
    operational_expenses.distributor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.distributor_id = operational_expenses.distributor_id
      AND up.role_name IN ('distributor_admin', 'distributor_manager', 'distributor_finance', 'distributor_user')
    )
  )
  OR
  -- Users can see their own submitted expenses
  operational_expenses.submitted_by = auth.uid()
);

-- INSERT Policy: All authenticated users can create expense requests
DROP POLICY IF EXISTS "Users can create operational expenses" ON public.operational_expenses;
CREATE POLICY "Users can create operational expenses" 
ON public.operational_expenses FOR INSERT 
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must be for user's brand or distributor
  (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND (
        up.brand_id = operational_expenses.brand_id
        OR 
        (operational_expenses.distributor_id IS NOT NULL AND up.distributor_id = operational_expenses.distributor_id)
      )
    )
  )
);

-- UPDATE Policy: Expense submitters, finance roles, and admins can update
DROP POLICY IF EXISTS "Users can update operational expenses based on role" ON public.operational_expenses;
CREATE POLICY "Users can update operational expenses based on role" 
ON public.operational_expenses FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = operational_expenses.brand_id)
      OR
      (up.role_name IN ('distributor_admin', 'distributor_finance') AND up.distributor_id = operational_expenses.distributor_id)
    )
  )
  OR
  operational_expenses.submitted_by = auth.uid()
  OR
  operational_expenses.created_by = auth.uid()
);

-- DELETE Policy: Only admins and expense submitters can delete (before approval)
DROP POLICY IF EXISTS "Users can delete operational expenses based on role" ON public.operational_expenses;
CREATE POLICY "Users can delete operational expenses based on role" 
ON public.operational_expenses FOR DELETE 
USING (
  -- Super admin can delete any
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Brand admin can delete brand expenses
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'brand_admin' 
    AND up.brand_id = operational_expenses.brand_id
  )
  OR
  -- Distributor admin can delete distributor expenses
  (
    operational_expenses.distributor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role_name = 'distributor_admin'
      AND up.distributor_id = operational_expenses.distributor_id
    )
  )
  OR
  -- Users can delete their own draft/pending expenses
  (
    (operational_expenses.submitted_by = auth.uid() OR operational_expenses.created_by = auth.uid())
    AND operational_expenses.status IN ('draft', 'pending_approval')
  )
);

-- =============================================
-- EXPENSE APPROVALS RLS POLICIES
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating RLS policies for expense_approvals...'; 
END $$;

-- SELECT Policy: Users can view approvals for expenses they have access to
DROP POLICY IF EXISTS "Users can view expense approvals based on expense access" ON public.expense_approvals;
CREATE POLICY "Users can view expense approvals based on expense access" 
ON public.expense_approvals FOR SELECT 
USING (
  -- Super admin can see all approvals
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Users can see approvals for expenses they have access to
  EXISTS (
    SELECT 1 FROM operational_expenses oe
    JOIN user_profiles up ON (up.user_id = auth.uid())
    WHERE oe.id = expense_approvals.expense_id
    AND (
      (up.brand_id = oe.brand_id AND up.role_name IN ('brand_admin', 'brand_manager', 'brand_finance'))
      OR
      (up.distributor_id = oe.distributor_id AND up.role_name IN ('distributor_admin', 'distributor_manager', 'distributor_finance'))
      OR
      oe.submitted_by = auth.uid()
      OR
      oe.created_by = auth.uid()
    )
  )
  OR
  -- Assigned approvers can see their approvals
  expense_approvals.approver_user_id = auth.uid()
);

-- INSERT Policy: System and admin roles can create approval records
DROP POLICY IF EXISTS "Users can create expense approvals based on role" ON public.expense_approvals;
CREATE POLICY "Users can create expense approvals based on role" 
ON public.expense_approvals FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name IN ('super_admin', 'brand_admin', 'brand_finance', 'distributor_admin', 'distributor_finance')
  )
);

-- UPDATE Policy: Approvers can update their approval decisions
DROP POLICY IF EXISTS "Users can update expense approvals based on role" ON public.expense_approvals;
CREATE POLICY "Users can update expense approvals based on role" 
ON public.expense_approvals FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  expense_approvals.approver_user_id = auth.uid()
);

-- DELETE Policy: Only super admin can delete approval records
DROP POLICY IF EXISTS "Users can delete expense approvals based on role" ON public.expense_approvals;
CREATE POLICY "Users can delete expense approvals based on role" 
ON public.expense_approvals FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
);

-- =============================================
-- FINANCIAL PERIODS RLS POLICIES
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating RLS policies for financial_periods...'; 
END $$;

-- SELECT Policy: Users can view periods for their brand or global periods
DROP POLICY IF EXISTS "Users can view financial periods based on organization" ON public.financial_periods;
CREATE POLICY "Users can view financial periods based on organization" 
ON public.financial_periods FOR SELECT 
USING (
  -- Super admin can see all periods
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND up.role_name = 'super_admin'
  )
  OR
  -- Global periods visible to all authenticated users
  is_global = TRUE
  OR
  -- Brand-specific periods visible to brand users
  (
    brand_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.brand_id = financial_periods.brand_id
    )
  )
);

-- INSERT Policy: Finance roles can create periods
DROP POLICY IF EXISTS "Users can create financial periods based on role" ON public.financial_periods;
CREATE POLICY "Users can create financial periods based on role" 
ON public.financial_periods FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = financial_periods.brand_id)
    )
  )
);

-- UPDATE Policy: Finance roles can update periods
DROP POLICY IF EXISTS "Users can update financial periods based on role" ON public.financial_periods;
CREATE POLICY "Users can update financial periods based on role" 
ON public.financial_periods FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name IN ('brand_admin', 'brand_finance') AND up.brand_id = financial_periods.brand_id)
    )
  )
);

-- DELETE Policy: Only super admin and brand admin can delete periods
DROP POLICY IF EXISTS "Users can delete financial periods based on role" ON public.financial_periods;
CREATE POLICY "Users can delete financial periods based on role" 
ON public.financial_periods FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() 
    AND (
      up.role_name = 'super_admin'
      OR 
      (up.role_name = 'brand_admin' AND up.brand_id = financial_periods.brand_id)
    )
  )
);

-- =============================================
-- CREATE SECURITY DEFINER FUNCTIONS FOR COMPLEX OPERATIONS
-- =============================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Creating security definer functions...'; 
END $$;

-- Function to check if user can manage financial data for a brand
CREATE OR REPLACE FUNCTION can_manage_brand_financials(target_brand_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid()
    AND (
      role_name = 'super_admin'
      OR
      (brand_id = target_brand_id AND role_name IN ('brand_admin', 'brand_finance'))
    )
  );
END;
$$;

-- Function to check if user can approve expenses up to a certain amount
CREATE OR REPLACE FUNCTION can_approve_expense_amount(expense_amount NUMERIC)
RETURNS TABLE (
  can_approve BOOLEAN,
  max_approval_amount NUMERIC,
  approval_level INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  user_brand UUID;
  user_distributor UUID;
BEGIN
  SELECT role_name, brand_id, distributor_id 
  INTO user_role, user_brand, user_distributor
  FROM user_profiles 
  WHERE user_id = auth.uid();

  -- Super admin can approve any amount
  IF user_role = 'super_admin' THEN
    RETURN QUERY SELECT TRUE, 999999999.99::NUMERIC, 1;
    RETURN;
  END IF;

  -- Brand admin can approve up to $50,000
  IF user_role = 'brand_admin' THEN
    RETURN QUERY SELECT (expense_amount <= 50000), 50000.00::NUMERIC, 2;
    RETURN;
  END IF;

  -- Brand finance can approve up to $25,000
  IF user_role = 'brand_finance' THEN
    RETURN QUERY SELECT (expense_amount <= 25000), 25000.00::NUMERIC, 3;
    RETURN;
  END IF;

  -- Distributor admin can approve up to $10,000
  IF user_role = 'distributor_admin' THEN
    RETURN QUERY SELECT (expense_amount <= 10000), 10000.00::NUMERIC, 4;
    RETURN;
  END IF;

  -- Default: cannot approve
  RETURN QUERY SELECT FALSE, 0.00::NUMERIC, 99;
END;
$$;

-- =============================================
-- FINAL SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINANCIAL MANAGEMENT RLS POLICIES CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS enabled for all financial tables:';
    RAISE NOTICE '- budget_categories';
    RAISE NOTICE '- financial_budgets';
    RAISE NOTICE '- budget_allocations';
    RAISE NOTICE '- operational_expenses';
    RAISE NOTICE '- expense_approvals';
    RAISE NOTICE '- financial_periods';
    RAISE NOTICE '';
    RAISE NOTICE 'Security features implemented:';
    RAISE NOTICE '- Multi-tenant data isolation';
    RAISE NOTICE '- Role-based access control';
    RAISE NOTICE '- Hierarchical permissions';
    RAISE NOTICE '- Expense approval thresholds';
    RAISE NOTICE '- Security definer functions';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Financial Management schema is secure!';
    RAISE NOTICE '========================================';
END $$;