import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OperationalExpense, CreateExpenseRequest, FinancialFilters } from '@/types/financial';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Build filters
    const filters: FinancialFilters = {
      brandId: searchParams.get('brandId') || undefined,
      distributorId: searchParams.get('distributorId') || undefined,
      department: searchParams.get('department') || undefined,
      costCenter: searchParams.get('costCenter') || undefined,
      expenseTypes: searchParams.get('expenseTypes')?.split(',') as any || undefined,
      status: searchParams.get('status')?.split(',') as any || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      amountMin: searchParams.get('amountMin') ? parseFloat(searchParams.get('amountMin')!) : undefined,
      amountMax: searchParams.get('amountMax') ? parseFloat(searchParams.get('amountMax')!) : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Build query with role-based access control
    let query = supabase
      .from('operational_expenses')
      .select(`
        id,
        expense_number,
        description,
        brand_id,
        distributor_id,
        region_id,
        department,
        cost_center,
        budget_category_id,
        expense_type,
        expense_subcategory,
        gross_amount,
        tax_amount,
        discount_amount,
        net_amount,
        currency,
        expense_date,
        due_date,
        paid_date,
        vendor_name,
        invoice_number,
        status,
        approval_status,
        submitted_by,
        approved_by,
        is_recurring,
        created_at,
        updated_at,
        budget_categories (
          name,
          category_type
        )
      `, { count: 'exact' });

    // Apply role-based filtering
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandUser = ["brand_admin", "brand_manager", "brand_finance", "brand_user"].includes(profile.role_name);
    const isDistributorUser = ["distributor_admin", "distributor_manager", "distributor_finance", "distributor_user"].includes(profile.role_name);

    if (!isSuperAdmin) {
      if (isBrandUser && profile.brand_id) {
        query = query.eq("brand_id", profile.brand_id);
      } else if (isDistributorUser && profile.distributor_id) {
        query = query.eq("distributor_id", profile.distributor_id);
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Apply additional filters
    if (filters.brandId && isSuperAdmin) {
      query = query.eq("brand_id", filters.brandId);
    }
    if (filters.distributorId) {
      query = query.eq("distributor_id", filters.distributorId);
    }
    if (filters.department) {
      query = query.eq("department", filters.department);
    }
    if (filters.costCenter) {
      query = query.eq("cost_center", filters.costCenter);
    }
    if (filters.expenseTypes && filters.expenseTypes.length > 0) {
      query = query.in("expense_type", filters.expenseTypes);
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }
    if (filters.dateFrom) {
      query = query.gte("expense_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("expense_date", filters.dateTo);
    }
    if (filters.amountMin !== undefined) {
      query = query.gte("net_amount", filters.amountMin);
    }
    if (filters.amountMax !== undefined) {
      query = query.lte("net_amount", filters.amountMax);
    }
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`);
    }

    // Apply sorting and pagination
    const sortBy = searchParams.get('sortBy') || 'expense_date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: expenses, error, count } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }

    return NextResponse.json({
      data: expenses || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
      pageSize: limit
    });

  } catch (error) {
    console.error('Unexpected error in expenses API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const expenseData: CreateExpenseRequest = await request.json();

    // Validate required fields
    const requiredFields = ['description', 'brandId', 'budgetCategoryId', 'expenseType', 'grossAmount', 'expenseDate'];
    const missingFields = requiredFields.filter(field => !expenseData[field as keyof CreateExpenseRequest]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: "Missing required fields", 
        validationErrors: missingFields.map(field => ({
          field,
          message: `${field} is required`,
          code: 'REQUIRED'
        }))
      }, { status: 400 });
    }

    // Validate access to brand/distributor
    if (profile.role_name !== "super_admin") {
      if (!profile.brand_id || profile.brand_id !== expenseData.brandId) {
        return NextResponse.json({ error: "Access denied for this brand" }, { status: 403 });
      }
      
      if (expenseData.distributorId && profile.distributor_id !== expenseData.distributorId) {
        return NextResponse.json({ error: "Access denied for this distributor" }, { status: 403 });
      }
    }

    // Validate expense amount
    if (expenseData.grossAmount <= 0) {
      return NextResponse.json({ 
        error: "Expense amount must be greater than zero",
        validationErrors: [{
          field: 'grossAmount',
          message: 'Amount must be positive',
          code: 'INVALID_AMOUNT'
        }]
      }, { status: 400 });
    }

    // Validate expense date
    const expenseDate = new Date(expenseData.expenseDate);
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const oneMonthAhead = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    if (expenseDate < oneYearAgo || expenseDate > oneMonthAhead) {
      return NextResponse.json({
        error: "Expense date must be within the last year and not more than one month in the future",
        validationErrors: [{
          field: 'expenseDate',
          message: 'Invalid expense date range',
          code: 'INVALID_DATE'
        }]
      }, { status: 400 });
    }

    // Verify budget category exists and user has access
    const { data: category, error: categoryError } = await supabase
      .from('budget_categories')
      .select('id, requires_approval, approval_threshold')
      .eq('id', expenseData.budgetCategoryId)
      .single();

    if (categoryError || !category) {
      return NextResponse.json({
        error: "Invalid budget category",
        validationErrors: [{
          field: 'budgetCategoryId',
          message: 'Budget category not found or access denied',
          code: 'INVALID_CATEGORY'
        }]
      }, { status: 400 });
    }

    // Determine approval status based on amount and category rules
    let approvalStatus = 'pending';
    let status = 'pending_approval';

    // Auto-approve small amounts for certain roles
    const isFinanceRole = ["brand_finance", "distributor_finance", "brand_admin", "distributor_admin"].includes(profile.role_name);
    const autoApprovalThreshold = isFinanceRole ? 1000 : 100; // $1000 for finance roles, $100 for others

    if (profile.role_name === "super_admin" || 
        (expenseData.grossAmount <= autoApprovalThreshold && !category.requires_approval)) {
      approvalStatus = 'approved';
      status = 'approved';
    }

    // Insert new expense
    const { data: newExpense, error: insertError } = await supabase
      .from('operational_expenses')
      .insert({
        description: expenseData.description,
        brand_id: expenseData.brandId,
        distributor_id: expenseData.distributorId || null,
        budget_category_id: expenseData.budgetCategoryId,
        expense_type: expenseData.expenseType,
        gross_amount: expenseData.grossAmount,
        currency: expenseData.currency || 'USD',
        expense_date: expenseData.expenseDate,
        vendor_name: expenseData.vendorName || null,
        invoice_number: expenseData.invoiceNumber || null,
        department: expenseData.department || null,
        internal_notes: expenseData.notes || null,
        status: status,
        approval_status: approvalStatus,
        submitted_by: user.id,
        created_by: user.id,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating expense:', insertError);
      return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }

    // Create approval workflow if needed
    if (status === 'pending_approval') {
      await createApprovalWorkflow(supabase, newExpense.id, expenseData.grossAmount, profile);
    }

    return NextResponse.json(newExpense, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in expense creation:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to create approval workflow
async function createApprovalWorkflow(supabase: any, expenseId: string, amount: number, userProfile: any) {
  try {
    const approvalLevels = [];

    // Determine approval levels based on amount
    if (amount <= 1000) {
      // Level 1: Department manager or finance role
      approvalLevels.push({
        expense_id: expenseId,
        approval_level: 1,
        approver_role: userProfile.role_name.includes('brand_') ? 'brand_finance' : 'distributor_finance',
        min_amount: 0,
        max_amount: 1000,
        is_final_approval: true
      });
    } else if (amount <= 10000) {
      // Level 1: Finance role
      approvalLevels.push({
        expense_id: expenseId,
        approval_level: 1,
        approver_role: userProfile.role_name.includes('brand_') ? 'brand_finance' : 'distributor_finance',
        min_amount: 0,
        max_amount: 10000,
        is_final_approval: false
      });
      
      // Level 2: Admin role
      approvalLevels.push({
        expense_id: expenseId,
        approval_level: 2,
        approver_role: userProfile.role_name.includes('brand_') ? 'brand_admin' : 'distributor_admin',
        min_amount: 1000,
        max_amount: 10000,
        is_final_approval: true
      });
    } else {
      // Level 1: Finance role
      approvalLevels.push({
        expense_id: expenseId,
        approval_level: 1,
        approver_role: userProfile.role_name.includes('brand_') ? 'brand_finance' : 'distributor_finance',
        min_amount: 0,
        max_amount: null,
        is_final_approval: false
      });
      
      // Level 2: Admin role
      approvalLevels.push({
        expense_id: expenseId,
        approval_level: 2,
        approver_role: userProfile.role_name.includes('brand_') ? 'brand_admin' : 'distributor_admin',
        min_amount: 1000,
        max_amount: null,
        is_final_approval: false
      });
      
      // Level 3: Super admin for large amounts
      approvalLevels.push({
        expense_id: expenseId,
        approval_level: 3,
        approver_role: 'super_admin',
        min_amount: 10000,
        max_amount: null,
        is_final_approval: true
      });
    }

    // Insert approval levels
    if (approvalLevels.length > 0) {
      await supabase
        .from('expense_approvals')
        .insert(approvalLevels);
    }

  } catch (error) {
    console.error('Error creating approval workflow:', error);
    // Don't fail the expense creation if approval workflow fails
  }
}