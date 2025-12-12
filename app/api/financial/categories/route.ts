import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { BudgetCategory, CreateBudgetCategoryRequest } from '@/types/financial';

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
    const categoryType = searchParams.get('categoryType');
    const isActive = searchParams.get('isActive');
    const includeGlobal = searchParams.get('includeGlobal') !== 'false'; // default true
    const hierarchical = searchParams.get('hierarchical') === 'true';

    // Build query
    let query = supabase
      .from('budget_categories')
      .select(`
        id,
        name,
        code,
        description,
        parent_id,
        category_level,
        full_path,
        category_type,
        is_active,
        requires_approval,
        approval_threshold,
        brand_id,
        is_global,
        created_at,
        updated_at
      `)
      .order('category_level', { ascending: true })
      .order('name', { ascending: true });

    // Apply access control
    const isSuperAdmin = profile.role_name === "super_admin";
    
    if (!isSuperAdmin) {
      // Users can see global categories and their brand's categories
      if (includeGlobal) {
        query = query.or(`is_global.eq.true,brand_id.eq.${profile.brand_id}`);
      } else {
        query = query.eq('brand_id', profile.brand_id);
      }
    }

    // Apply filters
    if (categoryType) {
      query = query.eq('category_type', categoryType);
    }
    
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Error fetching budget categories:', error);
      return NextResponse.json({ error: "Failed to fetch budget categories" }, { status: 500 });
    }

    if (!categories) {
      return NextResponse.json([]);
    }

    // If hierarchical structure requested, build tree
    if (hierarchical) {
      const categoryTree = buildCategoryTree(categories);
      return NextResponse.json(categoryTree);
    }

    return NextResponse.json(categories);

  } catch (error) {
    console.error('Unexpected error in budget categories API:', error);
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

    // Check permissions - only finance roles and admins can create categories
    const canCreateCategories = profile.role_name === "super_admin" ||
      ["brand_admin", "brand_finance"].includes(profile.role_name);

    if (!canCreateCategories) {
      return NextResponse.json({ error: "Insufficient permissions to create budget categories" }, { status: 403 });
    }

    const categoryData: CreateBudgetCategoryRequest = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'code', 'categoryType'];
    const missingFields = requiredFields.filter(field => !categoryData[field as keyof CreateBudgetCategoryRequest]);
    
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

    // Validate brand access
    const targetBrandId = categoryData.brandId || profile.brand_id;
    if (profile.role_name !== "super_admin" && profile.brand_id !== targetBrandId) {
      return NextResponse.json({ error: "Access denied for this brand" }, { status: 403 });
    }

    // Check for duplicate code within the brand
    const { data: existingCategory } = await supabase
      .from('budget_categories')
      .select('id')
      .eq('code', categoryData.code)
      .eq('brand_id', targetBrandId)
      .single();

    if (existingCategory) {
      return NextResponse.json({
        error: "Category code already exists for this brand",
        validationErrors: [{
          field: 'code',
          message: 'Category code must be unique within the brand',
          code: 'DUPLICATE_CODE'
        }]
      }, { status: 409 });
    }

    // Validate parent category if specified
    let categoryLevel = 1;
    let fullPath = categoryData.name;
    
    if (categoryData.parentId) {
      const { data: parentCategory, error: parentError } = await supabase
        .from('budget_categories')
        .select('category_level, full_path, brand_id, is_global')
        .eq('id', categoryData.parentId)
        .single();

      if (parentError || !parentCategory) {
        return NextResponse.json({
          error: "Invalid parent category",
          validationErrors: [{
            field: 'parentId',
            message: 'Parent category not found or access denied',
            code: 'INVALID_PARENT'
          }]
        }, { status: 400 });
      }

      // Check if user has access to parent category
      if (!parentCategory.is_global && parentCategory.brand_id !== targetBrandId) {
        return NextResponse.json({
          error: "Access denied to parent category",
          validationErrors: [{
            field: 'parentId',
            message: 'Cannot access parent category',
            code: 'PARENT_ACCESS_DENIED'
          }]
        }, { status: 403 });
      }

      categoryLevel = parentCategory.category_level + 1;
      fullPath = `${parentCategory.full_path}/${categoryData.name}`;

      // Prevent deep nesting (max 5 levels)
      if (categoryLevel > 5) {
        return NextResponse.json({
          error: "Maximum category depth exceeded",
          validationErrors: [{
            field: 'parentId',
            message: 'Cannot create category deeper than 5 levels',
            code: 'MAX_DEPTH_EXCEEDED'
          }]
        }, { status: 400 });
      }
    }

    // Validate approval threshold
    if (categoryData.approvalThreshold && categoryData.approvalThreshold < 0) {
      return NextResponse.json({
        error: "Approval threshold must be non-negative",
        validationErrors: [{
          field: 'approvalThreshold',
          message: 'Approval threshold cannot be negative',
          code: 'INVALID_THRESHOLD'
        }]
      }, { status: 400 });
    }

    // Insert new category
    const { data: newCategory, error: insertError } = await supabase
      .from('budget_categories')
      .insert({
        name: categoryData.name,
        code: categoryData.code,
        description: categoryData.description || null,
        parent_id: categoryData.parentId || null,
        category_level: categoryLevel,
        full_path: fullPath,
        category_type: categoryData.categoryType,
        is_active: true,
        requires_approval: categoryData.requiresApproval || false,
        approval_threshold: categoryData.approvalThreshold || null,
        brand_id: targetBrandId,
        is_global: profile.role_name === "super_admin" && !targetBrandId,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating budget category:', insertError);
      return NextResponse.json({ error: "Failed to create budget category" }, { status: 500 });
    }

    return NextResponse.json(newCategory, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in budget category creation:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to build hierarchical category tree
function buildCategoryTree(categories: BudgetCategory[]): BudgetCategory[] {
  const categoryMap = new Map<string, BudgetCategory & { children?: BudgetCategory[] }>();
  const rootCategories: (BudgetCategory & { children?: BudgetCategory[] })[] = [];

  // First pass: create map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach(category => {
    const categoryWithChildren = categoryMap.get(category.id)!;
    
    if (category.parentId && categoryMap.has(category.parentId)) {
      const parent = categoryMap.get(category.parentId)!;
      parent.children!.push(categoryWithChildren);
    } else {
      rootCategories.push(categoryWithChildren);
    }
  });

  return rootCategories;
}