import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidStatusTransition } from "@/lib/orders/status-workflow";
import { OrderStatus } from "@/types/orders";
import { 
  syncOrderAllocation, 
  syncOrderFulfillment, 
  syncOrderCancellation 
} from "@/lib/inventory/order-sync";

export async function PATCH(
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

    const body = await request.json();
    
    // Fetch current order to check permissions and current status
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check Permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    const isSuperAdmin = profile?.role_name === "super_admin";
    const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");

    // Permission checks (enforce for all users including super admin)
    if (!isSuperAdmin) {
      // Brand admin or distributor admin must match brand_id
      if (currentOrder.brand_id !== profile?.brand_id) {
        return NextResponse.json(
          { error: "You do not have access to this order" },
          { status: 403 }
        );
      }
      
      // Distributor admin must also match distributor_id
      if (
        isDistributorAdmin &&
        currentOrder.distributor_id !== profile?.distributor_id
      ) {
        return NextResponse.json(
          { error: "You can only update orders for your distributor" },
          { status: 403 }
        );
      }
    }

    // Validate Status Transition
    if (body.order_status && body.order_status !== currentOrder.order_status) {
      const isValid = isValidStatusTransition(
        currentOrder.order_status as OrderStatus,
        body.order_status as OrderStatus
      );

      if (!isValid) {
        return NextResponse.json(
          {
            error: `Invalid status transition from "${currentOrder.order_status}" to "${body.order_status}". Orders must progress through: pending -> processing -> shipped -> delivered.`,
          },
          { status: 400 }
        );
      }
    }

    // Prepare updates
    const updates = {
      ...body,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Prevent changing critical immutable fields
    delete updates.id;
    delete updates.brand_id;
    delete updates.created_at;
    delete updates.created_by;
    delete updates.order_number;

    // Perform Update (the trigger will automatically log the change to order_history)
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update order" },
        { status: 500 }
      );
    }

    // Handle inventory synchronization based on status transition
    const oldStatus = currentOrder.order_status as OrderStatus;
    const newStatus = body.order_status as OrderStatus;

    if (newStatus && oldStatus !== newStatus) {
      // Allocate stock when order moves to "processing"
      if (newStatus === "processing" && oldStatus === "pending") {
        const syncResult = await syncOrderAllocation(id, user.id, true);
        if (!syncResult.success) {
          console.error("Failed to allocate inventory:", syncResult.error);
          // Note: Order status is already updated, but inventory sync failed
          // Consider adding a flag or notification for manual review
        }
      }
      // Deduct stock when order is "shipped" (fulfillment)
      else if (newStatus === "shipped" && oldStatus === "processing") {
        const syncResult = await syncOrderFulfillment(id, user.id);
        if (!syncResult.success) {
          console.error("Failed to sync inventory on fulfillment:", syncResult.error);
        }
      }
      // Release stock when order is cancelled
      else if (newStatus === "cancelled") {
        const syncResult = await syncOrderCancellation(id, user.id, body.notes);
        if (!syncResult.success) {
          console.error("Failed to release inventory on cancellation:", syncResult.error);
        }
      }
      // "delivered" status has no inventory impact (just confirmation)
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error("Unexpected error updating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

