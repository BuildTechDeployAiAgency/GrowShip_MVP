import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateBudgetRequest } from '@/types/financial';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: budget, error } = await supabase
      .from('financial_budgets')
      .select(`
        *,
        budget_categories (
          id,
          name,
          category_type,
          requires_approval
        ),
        budget_allocations (
          id,
          allocation_type,
          target_name,
          allocated_amount,
          spent_amount,
          remaining_amount,
          status
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Budget not found" }, { status: 404 });
      }
      console.error('Error fetching budget:', error);
      return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
    }

    return NextResponse.json(budget);

  } catch (error) {
    console.error('Unexpected error in budget GET:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Get existing budget to check access
    const { data: existingBudget, error: fetchError } = await supabase
      .from('financial_budgets')
      .select('brand_id, distributor_id, created_by, status')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Budget not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
    }

    // Check permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_finance"].includes(profile.role_name) && profile.brand_id === existingBudget.brand_id;
    const isDistributorAdmin = ["distributor_admin", "distributor_finance"].includes(profile.role_name) && profile.distributor_id === existingBudget.distributor_id;
    const isCreator = existingBudget.created_by === user.id;

    if (!isSuperAdmin && !isBrandAdmin && !isDistributorAdmin && !isCreator) {
      return NextResponse.json({ error: "Insufficient permissions to update this budget" }, { status: 403 });
    }

    const updateData: UpdateBudgetRequest = await request.json();

    // Prevent modification of locked budgets (except by super admin)
    if (existingBudget.status === 'locked' && !isSuperAdmin) {
      return NextResponse.json({ error: "Cannot modify locked budget" }, { status: 409 });
    }

    // Validate amounts if being updated
    if (updateData.allocatedAmount && updateData.plannedAmount) {
      if (updateData.allocatedAmount > updateData.plannedAmount * 1.1) {
        return NextResponse.json({ 
          error: "Allocated amount cannot exceed planned amount by more than 10%",
          validationErrors: [{
            field: 'allocatedAmount',
            message: 'Allocated amount exceeds planned amount threshold',
            code: 'AMOUNT_EXCEEDED'
          }]
        }, { status: 400 });
      }
    }

    // Validate date range if being updated
    if (updateData.periodEndDate && updateData.periodStartDate) {
      if (new Date(updateData.periodEndDate) <= new Date(updateData.periodStartDate)) {
        return NextResponse.json({
          error: "End date must be after start date",
          validationErrors: [{
            field: 'periodEndDate',
            message: 'End date must be after start date',
            code: 'INVALID_DATE_RANGE'
          }]
        }, { status: 400 });
      }
    }

    // Build update object
    const updateFields: any = {};
    
    if (updateData.budgetName) updateFields.budget_name = updateData.budgetName;
    if (updateData.plannedAmount !== undefined) updateFields.planned_amount = updateData.plannedAmount;
    if (updateData.allocatedAmount !== undefined) updateFields.allocated_amount = updateData.allocatedAmount;
    if (updateData.periodStartDate) updateFields.period_start_date = updateData.periodStartDate;
    if (updateData.periodEndDate) updateFields.period_end_date = updateData.periodEndDate;
    if (updateData.department !== undefined) updateFields.department = updateData.department;
    if (updateData.costCenter !== undefined) updateFields.cost_center = updateData.costCenter;
    if (updateData.budgetJustification !== undefined) updateFields.budget_justification = updateData.budgetJustification;
    if (updateData.tags !== undefined) updateFields.tags = updateData.tags;
    
    // Status changes require additional validation
    if (updateData.status) {
      if (updateData.status === 'approved' && !["super_admin", "brand_admin", "distributor_admin"].includes(profile.role_name)) {
        return NextResponse.json({ error: "Insufficient permissions to approve budget" }, { status: 403 });
      }
      updateFields.status = updateData.status;
      
      if (updateData.status === 'approved') {
        updateFields.approved_by = user.id;
        updateFields.approved_at = new Date().toISOString();
        updateFields.approval_status = 'approved';
      }
    }

    if (updateData.approvalStatus) {
      updateFields.approval_status = updateData.approvalStatus;
    }

    if (updateData.revisionReason) {
      updateFields.revision_reason = updateData.revisionReason;
      updateFields.version_number = existingBudget.version_number ? existingBudget.version_number + 1 : 2;
    }

    // Update the budget
    const { data: updatedBudget, error: updateError } = await supabase
      .from('financial_budgets')
      .update(updateFields)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating budget:', updateError);
      return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
    }

    return NextResponse.json(updatedBudget);

  } catch (error) {
    console.error('Unexpected error in budget PUT:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Get existing budget to check access
    const { data: existingBudget, error: fetchError } = await supabase
      .from('financial_budgets')
      .select('brand_id, distributor_id, status, spent_amount')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Budget not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
    }

    // Check permissions - only super admin and brand admin can delete
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = profile.role_name === "brand_admin" && profile.brand_id === existingBudget.brand_id;

    if (!isSuperAdmin && !isBrandAdmin) {
      return NextResponse.json({ error: "Insufficient permissions to delete this budget" }, { status: 403 });
    }

    // Prevent deletion of budgets with spending
    if (existingBudget.spent_amount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete budget with existing spending",
        validationErrors: [{
          field: 'spent_amount',
          message: 'Budget has associated expenses and cannot be deleted',
          code: 'HAS_SPENDING'
        }]
      }, { status: 409 });
    }

    // Prevent deletion of active or locked budgets
    if (['active', 'locked'].includes(existingBudget.status)) {
      return NextResponse.json({ 
        error: `Cannot delete ${existingBudget.status} budget`,
        validationErrors: [{
          field: 'status',
          message: `Budget status '${existingBudget.status}' prevents deletion`,
          code: 'INVALID_STATUS'
        }]
      }, { status: 409 });
    }

    // Delete the budget
    const { error: deleteError } = await supabase
      .from('financial_budgets')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting budget:', deleteError);
      return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
    }

    return NextResponse.json({ message: "Budget deleted successfully" });

  } catch (error) {
    console.error('Unexpected error in budget DELETE:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}