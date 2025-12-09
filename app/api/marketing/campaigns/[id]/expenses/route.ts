import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateExpenseRequest } from "@/types/marketing";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Verify campaign access
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .select("brand_id, distributor_id")
      .eq("id", campaignId)
      .single();

    if (campaignError) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Check access permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    const hasAccess = isSuperAdmin || 
                     (isBrandAdmin && campaign.brand_id === (profile.brand_id || profile.organization_id)) ||
                     campaign.distributor_id === profile.organization_id;
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions to view campaign expenses" },
        { status: 403 }
      );
    }

    // Get expenses
    const { data: expenses, error } = await supabase
      .from("campaign_expenses")
      .select(`
        id,
        campaign_id,
        expense_type,
        subcategory,
        description,
        amount,
        currency,
        expense_date,
        due_date,
        paid_date,
        vendor_name,
        vendor_contact,
        invoice_number,
        payment_method,
        status,
        approved_by,
        approved_at,
        is_recurring,
        recurrence_pattern,
        allocation_percentage,
        receipt_url,
        invoice_url,
        supporting_docs,
        created_by,
        created_at,
        updated_at
      `)
      .eq("campaign_id", campaignId)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("Error fetching campaign expenses:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaign expenses" },
        { status: 500 }
      );
    }

    return NextResponse.json(expenses || []);

  } catch (error: any) {
    console.error("Unexpected error fetching campaign expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const body: CreateExpenseRequest = await request.json();

    // Validate required fields
    if (!body.expenseType || !body.description || !body.amount || !body.expenseDate) {
      return NextResponse.json(
        { error: "Missing required fields: expenseType, description, amount, expenseDate" },
        { status: 400 }
      );
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    // Validate allocation percentage
    if (body.allocationPercentage && (body.allocationPercentage <= 0 || body.allocationPercentage > 100)) {
      return NextResponse.json(
        { error: "Allocation percentage must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Verify campaign exists and user has access
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .select("brand_id, distributor_id, total_budget, allocated_budget")
      .eq("id", campaignId)
      .single();

    if (campaignError) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Check access permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = ["brand_admin", "brand_manager"].includes(profile.role_name);
    const hasAccess = isSuperAdmin || 
                     (isBrandAdmin && campaign.brand_id === (profile.brand_id || profile.organization_id)) ||
                     campaign.distributor_id === profile.organization_id;
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions to create expenses for this campaign" },
        { status: 403 }
      );
    }

    // Check if expense would exceed allocated budget
    const { data: currentExpenses } = await supabase
      .from("campaign_expenses")
      .select("amount")
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "approved", "paid"]);

    const currentTotal = currentExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
    const newTotal = currentTotal + body.amount;

    if (newTotal > campaign.allocated_budget) {
      return NextResponse.json(
        { 
          error: `Expense would exceed allocated budget. Current total: $${currentTotal.toFixed(2)}, Allocated: $${campaign.allocated_budget.toFixed(2)}`,
          warningOnly: true // Could be treated as warning instead of error
        },
        { status: 400 }
      );
    }

    // Prepare expense data
    const expenseData = {
      campaign_id: campaignId,
      expense_type: body.expenseType,
      subcategory: body.subcategory,
      description: body.description,
      amount: body.amount,
      currency: 'USD', // Default to USD, could be configurable
      expense_date: body.expenseDate,
      due_date: body.dueDate,
      vendor_name: body.vendorName,
      vendor_contact: body.vendorContact,
      invoice_number: body.invoiceNumber,
      payment_method: body.paymentMethod,
      status: 'pending', // Default status
      is_recurring: body.isRecurring || false,
      recurrence_pattern: body.recurrencePattern,
      allocation_percentage: body.allocationPercentage || 100,
      created_by: user.id,
    };

    // Insert expense
    const { data: expense, error: insertError } = await supabase
      .from("campaign_expenses")
      .insert(expenseData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating campaign expense:", insertError);
      return NextResponse.json(
        { error: "Failed to create campaign expense" },
        { status: 500 }
      );
    }

    return NextResponse.json(expense, { status: 201 });

  } catch (error: any) {
    console.error("Unexpected error creating campaign expense:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}