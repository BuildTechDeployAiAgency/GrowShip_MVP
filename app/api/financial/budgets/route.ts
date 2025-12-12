import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { FinancialBudget, CreateBudgetRequest, FinancialFilters } from '@/types/financial';

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
      fiscalYear: searchParams.get('fiscalYear') ? parseInt(searchParams.get('fiscalYear')!) : undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status')?.split(',') as any || undefined,
    };

    // Build query with role-based access control
    let query = supabase
      .from('financial_budgets')
      .select(`
        id,
        budget_name,
        budget_code,
        brand_id,
        distributor_id,
        region_id,
        budget_category_id,
        fiscal_year,
        period_type,
        period_start_date,
        period_end_date,
        planned_amount,
        allocated_amount,
        spent_amount,
        remaining_amount,
        variance_amount,
        variance_percentage,
        currency,
        status,
        approval_status,
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
    if (filters.fiscalYear) {
      query = query.eq("fiscal_year", filters.fiscalYear);
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }
    if (filters.search) {
      query = query.or(`budget_name.ilike.%${filters.search}%,budget_code.ilike.%${filters.search}%`);
    }

    // Apply sorting and pagination
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: budgets, error, count } = await query;

    if (error) {
      console.error('Error fetching budgets:', error);
      return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
    }

    return NextResponse.json({
      data: budgets || [],
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      currentPage: page,
      pageSize: limit
    });

  } catch (error) {
    console.error('Unexpected error in budgets API:', error);
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

    // Check permissions - only finance roles and admins can create budgets
    const canCreateBudgets = profile.role_name === "super_admin" ||
      ["brand_admin", "brand_finance"].includes(profile.role_name) ||
      ["distributor_admin", "distributor_finance"].includes(profile.role_name);

    if (!canCreateBudgets) {
      return NextResponse.json({ error: "Insufficient permissions to create budgets" }, { status: 403 });
    }

    const budgetData: CreateBudgetRequest = await request.json();

    // Validate required fields
    const requiredFields = ['budgetName', 'brandId', 'budgetCategoryId', 'fiscalYear', 'periodType', 'periodStartDate', 'periodEndDate', 'plannedAmount', 'allocatedAmount'];
    const missingFields = requiredFields.filter(field => !budgetData[field as keyof CreateBudgetRequest]);
    
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
    if (!profile.brand_id || profile.brand_id !== budgetData.brandId) {
      if (profile.role_name !== "super_admin") {
        return NextResponse.json({ error: "Access denied for this brand" }, { status: 403 });
      }
    }

    // Validate budget amounts
    if (budgetData.allocatedAmount > budgetData.plannedAmount * 1.1) {
      return NextResponse.json({ 
        error: "Allocated amount cannot exceed planned amount by more than 10%",
        validationErrors: [{
          field: 'allocatedAmount',
          message: 'Allocated amount exceeds planned amount threshold',
          code: 'AMOUNT_EXCEEDED'
        }]
      }, { status: 400 });
    }

    // Validate date range
    if (new Date(budgetData.periodEndDate) <= new Date(budgetData.periodStartDate)) {
      return NextResponse.json({
        error: "End date must be after start date",
        validationErrors: [{
          field: 'periodEndDate',
          message: 'End date must be after start date',
          code: 'INVALID_DATE_RANGE'
        }]
      }, { status: 400 });
    }

    // Check for duplicate budget (same brand, category, fiscal year, period type)
    const { data: existingBudget } = await supabase
      .from('financial_budgets')
      .select('id')
      .eq('brand_id', budgetData.brandId)
      .eq('budget_category_id', budgetData.budgetCategoryId)
      .eq('fiscal_year', budgetData.fiscalYear)
      .eq('period_type', budgetData.periodType)
      .single();

    if (existingBudget) {
      return NextResponse.json({
        error: "A budget already exists for this category, fiscal year, and period type",
        validationErrors: [{
          field: 'budgetCategoryId',
          message: 'Duplicate budget for this category and period',
          code: 'DUPLICATE_BUDGET'
        }]
      }, { status: 409 });
    }

    // Insert new budget
    const { data: newBudget, error: insertError } = await supabase
      .from('financial_budgets')
      .insert({
        budget_name: budgetData.budgetName,
        brand_id: budgetData.brandId,
        distributor_id: budgetData.distributorId || null,
        region_id: budgetData.regionId || null,
        budget_category_id: budgetData.budgetCategoryId,
        fiscal_year: budgetData.fiscalYear,
        period_type: budgetData.periodType,
        period_start_date: budgetData.periodStartDate,
        period_end_date: budgetData.periodEndDate,
        planned_amount: budgetData.plannedAmount,
        allocated_amount: budgetData.allocatedAmount,
        currency: budgetData.currency || 'USD',
        department: budgetData.department || null,
        cost_center: budgetData.costCenter || null,
        budget_justification: budgetData.budgetJustification || null,
        tags: budgetData.tags || [],
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating budget:', insertError);
      return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
    }

    return NextResponse.json(newBudget, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in budget creation:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}