import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for brand access control
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get customer profile to verify access
    const { data: customer, error: customerError } = await supabase
      .from("user_profiles")
      .select("user_id, email, company_name, first_name, last_name, brand_id")
      .eq("user_id", id)
      .like("role_name", "%customer%")
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check brand access (unless super admin)
    const isSuperAdmin = profile.role_name === "super_admin";
    if (!isSuperAdmin && customer.brand_id !== profile.brand_id) {
      return NextResponse.json(
        { error: "You don't have permission to view this customer's receivables" },
        { status: 403 }
      );
    }

    // Get query parameters
    const asOfDate = searchParams.get("asOfDate");
    const sortBy = searchParams.get("sortBy") || "daysOverdue";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const minimumAmount = searchParams.get("minimumAmount");
    const agingBucket = searchParams.get("agingBucket"); // Filter by specific bucket

    // Determine customer name
    const customerName = customer.company_name || 
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || 
      customer.email;

    // Build query for detailed receivables aging
    let query = supabase
      .from("customer_receivables_aging")
      .select(`
        invoice_id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        outstanding_amount,
        days_overdue,
        aging_bucket,
        payment_status
      `)
      .eq("customer_id", id)
      .eq("brand_id", customer.brand_id);

    // Apply filters
    if (agingBucket && agingBucket !== "all") {
      query = query.eq("aging_bucket", agingBucket);
    }

    if (minimumAmount) {
      query = query.gte("outstanding_amount", parseFloat(minimumAmount));
    }

    // Apply sorting
    const validSortColumns = ["outstanding_amount", "invoice_date", "due_date", "days_overdue", "invoice_number"];
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : "days_overdue";
    const finalSortDirection = sortDirection === "asc" ? { ascending: true } : { ascending: false };

    query = query.order(finalSortBy, finalSortDirection);

    const { data: receivablesDetails, error: receivablesError } = await query;

    if (receivablesError) {
      console.error("Error fetching receivables details:", receivablesError);
      return NextResponse.json(
        { error: "Failed to fetch receivables data" },
        { status: 500 }
      );
    }

    // Get aging summary
    const { data: agingSummary, error: agingSummaryError } = await supabase.rpc(
      "get_receivables_aging_summary",
      {
        p_customer_id: id,
        p_customer_name: customerName,
        p_brand_id: customer.brand_id
      }
    );

    if (agingSummaryError) {
      console.error("Error fetching aging summary:", agingSummaryError);
    }

    // Format receivables details
    const formattedReceivables = receivablesDetails?.map((item: any) => ({
      invoiceId: item.invoice_id,
      invoiceNumber: item.invoice_number,
      invoiceDate: item.invoice_date,
      dueDate: item.due_date,
      totalAmount: parseFloat(item.total_amount || 0),
      outstandingAmount: parseFloat(item.outstanding_amount || 0),
      daysOverdue: parseInt(item.days_overdue || 0),
      paymentStatus: item.payment_status,
      agingBucket: item.aging_bucket,
      isOverdue: item.days_overdue > 0,
    })) || [];

    // Format aging summary
    const formattedSummary = {
      totalOutstanding: 0,
      totalInvoices: 0,
      buckets: {
        current: { amount: 0, count: 0, percentage: 0 },
        days31to60: { amount: 0, count: 0, percentage: 0 },
        days61to90: { amount: 0, count: 0, percentage: 0 },
        over90Days: { amount: 0, count: 0, percentage: 0 },
      }
    };

    if (agingSummary && agingSummary.length > 0) {
      agingSummary.forEach((bucket: any) => {
        const amount = parseFloat(bucket.total_amount || 0);
        const count = parseInt(bucket.invoice_count || 0);
        const percentage = parseFloat(bucket.percentage || 0);

        formattedSummary.totalOutstanding += amount;
        formattedSummary.totalInvoices += count;

        switch (bucket.aging_bucket) {
          case "current":
            formattedSummary.buckets.current = { amount, count, percentage };
            break;
          case "days_31_60":
            formattedSummary.buckets.days31to60 = { amount, count, percentage };
            break;
          case "days_61_90":
            formattedSummary.buckets.days61to90 = { amount, count, percentage };
            break;
          case "over_90":
            formattedSummary.buckets.over90Days = { amount, count, percentage };
            break;
        }
      });
    }

    // Calculate additional metrics
    const averageInvoiceAmount = formattedSummary.totalInvoices > 0 
      ? formattedSummary.totalOutstanding / formattedSummary.totalInvoices 
      : 0;

    const averageDaysOverdue = formattedReceivables.length > 0
      ? formattedReceivables.reduce((sum: number, item: any) => sum + item.daysOverdue, 0) / formattedReceivables.length
      : 0;

    return NextResponse.json({
      summary: formattedSummary,
      receivables: formattedReceivables,
      metadata: {
        customerId: id,
        customerName,
        asOfDate: asOfDate || new Date().toISOString(),
        totalReceivables: formattedReceivables.length,
        averageInvoiceAmount,
        averageDaysOverdue,
        filters: {
          agingBucket,
          minimumAmount: minimumAmount ? parseFloat(minimumAmount) : null,
          sortBy: finalSortBy,
          sortDirection,
        },
      },
    });
  } catch (error: any) {
    console.error("Unexpected error fetching customer receivables:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}