import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await context.params;

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

    // Check if payment line exists and get current data
    const { data: paymentLine, error: paymentError } = await supabase
      .from("invoice_payment_lines")
      .select(`
        *,
        invoices!inner(id, brand_id, distributor_id)
      `)
      .eq("id", paymentId)
      .eq("invoice_id", id)
      .single();

    if (paymentError || !paymentLine) {
      return NextResponse.json({ error: "Payment line not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amount, payment_method, payment_date, reference_number, notes, status } = body;

    // Check permissions for different operations
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = profile.role_name === "brand_admin" && paymentLine.invoices.brand_id === profile.organization_id;
    const isOwner = paymentLine.created_by === user.id;
    const isDistributor = paymentLine.invoices.distributor_id === profile.organization_id;

    // Only brand admins and super admins can change status (verify/reject payments)
    if (status && status !== paymentLine.status) {
      if (!isSuperAdmin && !isBrandAdmin) {
        return NextResponse.json(
          { error: "You do not have permission to verify payments" },
          { status: 403 }
        );
      }
    }

    // Users can edit their own unverified payment lines, admins can edit any
    if (!isSuperAdmin && !isBrandAdmin && (!isOwner || paymentLine.status === "verified")) {
      return NextResponse.json(
        { error: "You can only edit your own unverified payment lines" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 }
        );
      }
      updateData.amount = parseFloat(amount);
    }
    
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (payment_date !== undefined) updateData.payment_date = payment_date;
    if (reference_number !== undefined) updateData.reference_number = reference_number;
    if (notes !== undefined) updateData.notes = notes;
    
    // Only admins can update status and verification fields
    if (status && (isSuperAdmin || isBrandAdmin)) {
      updateData.status = status;
      if (status === "verified") {
        updateData.verified_by = user.id;
        updateData.verified_at = new Date().toISOString();
      } else if (status === "pending") {
        updateData.verified_by = null;
        updateData.verified_at = null;
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedPaymentLine, error: updateError } = await supabase
      .from("invoice_payment_lines")
      .update(updateData)
      .eq("id", paymentId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating payment line:", updateError);
      return NextResponse.json(
        { error: "Failed to update payment line" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPaymentLine);
  } catch (error: any) {
    console.error("Unexpected error updating payment line:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if payment line exists and get current data
    const { data: paymentLine, error: paymentError } = await supabase
      .from("invoice_payment_lines")
      .select("id, status, created_by")
      .eq("id", paymentId)
      .eq("invoice_id", id)
      .single();

    if (paymentError || !paymentLine) {
      return NextResponse.json({ error: "Payment line not found" }, { status: 404 });
    }

    // Users can only delete their own unverified payment lines
    if (paymentLine.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own payment lines" },
        { status: 403 }
      );
    }

    if (paymentLine.status === "verified") {
      return NextResponse.json(
        { error: "Cannot delete verified payment lines" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("invoice_payment_lines")
      .delete()
      .eq("id", paymentId);

    if (deleteError) {
      console.error("Error deleting payment line:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete payment line" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unexpected error deleting payment line:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}