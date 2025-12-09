import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch payment lines for the invoice with attachment counts
    const { data: paymentLines, error } = await supabase
      .from("invoice_payment_lines")
      .select(`
        *,
        payment_attachments(count)
      `)
      .eq("invoice_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment lines:", error);
      return NextResponse.json(
        { error: "Failed to fetch payment lines" },
        { status: 500 }
      );
    }

    return NextResponse.json(paymentLines || []);
  } catch (error: any) {
    console.error("Unexpected error fetching payment lines:", error);
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
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Check if invoice exists and user has access
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, brand_id, distributor_id")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check permissions
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = profile.role_name === "brand_admin" && invoice.brand_id === profile.organization_id;
    const isDistributor = invoice.distributor_id === profile.organization_id;

    if (!isSuperAdmin && !isBrandAdmin && !isDistributor) {
      return NextResponse.json(
        { error: "You do not have permission to add payments to this invoice" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, payment_method, payment_date, reference_number, notes } = body;

    // Validate required fields
    if (!amount || !payment_method || !payment_date) {
      return NextResponse.json(
        { error: "Amount, payment method, and payment date are required" },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Create payment line
    const paymentLineData = {
      invoice_id: id,
      amount: parseFloat(amount),
      payment_method,
      payment_date,
      reference_number: reference_number || null,
      notes: notes || null,
      status: "pending", // Always start as pending, admins can verify later
      created_by: user.id,
    };

    const { data: newPaymentLine, error: createError } = await supabase
      .from("invoice_payment_lines")
      .insert(paymentLineData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating payment line:", createError);
      return NextResponse.json(
        { error: "Failed to create payment line" },
        { status: 500 }
      );
    }

    return NextResponse.json(newPaymentLine);
  } catch (error: any) {
    console.error("Unexpected error creating payment line:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}