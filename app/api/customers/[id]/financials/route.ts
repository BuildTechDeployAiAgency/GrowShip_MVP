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
      .select("role_name, brand_id, organization_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Get customer profile to verify access and get customer details
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
        { error: "You don't have permission to view this customer's financial data" },
        { status: 403 }
      );
    }

    // Determine customer name for queries
    const customerName = customer.company_name || 
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || 
      customer.email;

    // Get optional query parameters
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const includeProjections = searchParams.get("includeProjections") === "true";

    // 1. Get financial summary
    let summaryQuery = supabase
      .from("customer_financial_summary")
      .select("*")
      .eq("customer_id", id)
      .eq("brand_id", customer.brand_id);

    const { data: summary, error: summaryError } = await summaryQuery.single();

    if (summaryError && summaryError.code !== 'PGRST116') { // Not found is OK
      console.error("Error fetching customer financial summary:", summaryError);
    }

    // 2. Get receivables aging using the function
    const { data: agingData, error: agingError } = await supabase.rpc(
      "get_receivables_aging_summary",
      {
        p_customer_id: id,
        p_customer_name: customerName,
        p_brand_id: customer.brand_id
      }
    );

    if (agingError) {
      console.error("Error fetching aging data:", agingError);
    }

    // 3. Get payment performance metrics
    const { data: performanceData, error: performanceError } = await supabase.rpc(
      "get_customer_payment_performance",
      {
        p_customer_id: id,
        p_customer_name: customerName,
        p_brand_id: customer.brand_id
      }
    );

    if (performanceError) {
      console.error("Error fetching performance data:", performanceError);
    }

    // 4. Calculate current DSO
    const { data: dsoData, error: dsoError } = await supabase.rpc(
      "calculate_customer_dso",
      {
        p_customer_id: id,
        p_customer_name: customerName,
        p_brand_id: customer.brand_id,
        p_period_days: 90
      }
    );

    if (dsoError) {
      console.error("Error calculating DSO:", dsoError);
    }

    // 5. Get detailed aging breakdown
    const { data: agingDetails, error: agingDetailsError } = await supabase
      .from("customer_receivables_aging")
      .select("*")
      .eq("customer_id", id)
      .eq("brand_id", customer.brand_id)
      .order("days_overdue", { ascending: false });

    if (agingDetailsError) {
      console.error("Error fetching aging details:", agingDetailsError);
    }

    // 6. Get recent payment history for trends
    const { data: paymentHistory, error: paymentHistoryError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        paid_date,
        total_amount,
        payment_status
      `)
      .eq("customer_id", id)
      .eq("brand_id", customer.brand_id)
      .not("paid_date", "is", null)
      .order("paid_date", { ascending: false })
      .limit(50);

    if (paymentHistoryError) {
      console.error("Error fetching payment history:", paymentHistoryError);
    }

    // Format aging data into buckets
    const agingBuckets = {
      current: { amount: 0, invoiceCount: 0, percentage: 0, invoices: [] },
      days31to60: { amount: 0, invoiceCount: 0, percentage: 0, invoices: [] },
      days61to90: { amount: 0, invoiceCount: 0, percentage: 0, invoices: [] },
      over90Days: { amount: 0, invoiceCount: 0, percentage: 0, invoices: [] },
      totalAmount: 0,
      totalInvoices: 0,
    };

    if (agingData && agingData.length > 0) {
      agingData.forEach((bucket: any) => {
        switch (bucket.aging_bucket) {
          case "current":
            agingBuckets.current = {
              amount: parseFloat(bucket.total_amount || 0),
              invoiceCount: parseInt(bucket.invoice_count || 0),
              percentage: parseFloat(bucket.percentage || 0),
              invoices: []
            };
            break;
          case "days_31_60":
            agingBuckets.days31to60 = {
              amount: parseFloat(bucket.total_amount || 0),
              invoiceCount: parseInt(bucket.invoice_count || 0),
              percentage: parseFloat(bucket.percentage || 0),
              invoices: []
            };
            break;
          case "days_61_90":
            agingBuckets.days61to90 = {
              amount: parseFloat(bucket.total_amount || 0),
              invoiceCount: parseInt(bucket.invoice_count || 0),
              percentage: parseFloat(bucket.percentage || 0),
              invoices: []
            };
            break;
          case "over_90":
            agingBuckets.over90Days = {
              amount: parseFloat(bucket.total_amount || 0),
              invoiceCount: parseInt(bucket.invoice_count || 0),
              percentage: parseFloat(bucket.percentage || 0),
              invoices: []
            };
            break;
        }
      });

      // Calculate totals
      agingBuckets.totalAmount = 
        agingBuckets.current.amount +
        agingBuckets.days31to60.amount +
        agingBuckets.days61to90.amount +
        agingBuckets.over90Days.amount;

      agingBuckets.totalInvoices =
        agingBuckets.current.invoiceCount +
        agingBuckets.days31to60.invoiceCount +
        agingBuckets.days61to90.invoiceCount +
        agingBuckets.over90Days.invoiceCount;
    }

    // Add invoice details to aging buckets
    if (agingDetails && agingDetails.length > 0) {
      agingDetails.forEach((invoice: any) => {
        const invoiceDetail = {
          invoiceId: invoice.invoice_id,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          totalAmount: parseFloat(invoice.total_amount || 0),
          outstandingAmount: parseFloat(invoice.outstanding_amount || 0),
          daysOverdue: parseInt(invoice.days_overdue || 0),
          paymentStatus: invoice.payment_status,
        };

        switch (invoice.aging_bucket) {
          case "current":
            (agingBuckets.current.invoices as any[]).push(invoiceDetail);
            break;
          case "days_31_60":
            (agingBuckets.days31to60.invoices as any[]).push(invoiceDetail);
            break;
          case "days_61_90":
            (agingBuckets.days61to90.invoices as any[]).push(invoiceDetail);
            break;
          case "over_90":
            (agingBuckets.over90Days.invoices as any[]).push(invoiceDetail);
            break;
        }
      });
    }

    // Build response
    const financialMetrics = {
      customerId: id,
      customerName: customerName,
      
      // Outstanding Receivables
      totalOutstandingReceivables: parseFloat(summary?.total_outstanding_receivables || 0),
      receivablesAging: agingBuckets,
      
      // Outstanding Payables
      totalOutstandingPayables: parseFloat(summary?.total_outstanding_payables || 0),
      payablesBreakdown: {
        creditMemos: 0, // Would need additional data structure
        refundsPending: parseFloat(summary?.total_outstanding_payables || 0),
        overpayments: 0,
        returnAuthorizations: 0,
        totalAmount: parseFloat(summary?.total_outstanding_payables || 0),
      },
      
      // Days Sales Outstanding
      currentDSO: parseFloat(dsoData || 0),
      averageDSO: parseFloat(performanceData?.[0]?.current_dso || 0),
      dsoTrend: [], // Would need historical data
      
      // Additional metrics
      averagePaymentDays: parseFloat(performanceData?.[0]?.avg_days_to_pay || summary?.avg_days_to_pay || 0),
      creditLimit: null, // Would need additional field
      creditUtilization: null,
      
      // Payment performance metrics
      onTimePaymentRate: parseFloat(performanceData?.[0]?.on_time_payment_rate || summary?.on_time_payment_rate || 0),
      earlyPaymentRate: parseFloat(performanceData?.[0]?.early_payment_rate || 0),
      latePaymentRate: parseFloat(performanceData?.[0]?.late_payment_rate || 0),
      riskScore: parseInt(performanceData?.[0]?.risk_score || 1),
      
      // Summary stats
      totalInvoicesCount: parseInt(summary?.total_invoices || 0),
      totalOrdersCount: parseInt(summary?.total_orders || 0),
      lifetimeValue: parseFloat(summary?.total_invoiced_amount || summary?.total_order_amount || 0),
      
      // Metadata
      lastCalculated: new Date().toISOString(),
    };

    return NextResponse.json(financialMetrics);
  } catch (error: any) {
    console.error("Unexpected error fetching customer financials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}