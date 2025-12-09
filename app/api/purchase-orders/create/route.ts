import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPOCreatedAlert, createPOApprovalAlert } from "@/lib/notifications/po-alerts";
import type { PurchaseOrder } from "@/types/purchase-orders";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      brand_id,
      distributor_id,
      supplier_id,
      po_status,
      currency,
      notes,
      expected_delivery_date,
      payment_status,
      lines,
      ...rest
    } = body;

    // Validate required fields
    if (!brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Generate PO number
    const poNumber = `PO-${Date.now()}`;
    const poDate = new Date().toISOString();

    // Create the PO data
    const poData: Partial<PurchaseOrder> = {
      brand_id,
      distributor_id: distributor_id || null,
      supplier_id: supplier_id || null,
      user_id: user.id,
      po_number: poNumber,
      po_date: poDate,
      po_status: po_status || "pending",
      currency: currency || "USD",
      notes: notes || null,
      expected_delivery_date: expected_delivery_date || null,
      payment_status: payment_status || "pending",
      created_by: user.id,
      updated_by: user.id,
      ...rest,
    };

    // Insert the PO
    const { data: newPO, error: createError } = await supabase
      .from("purchase_orders")
      .insert(poData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating PO:", createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    // Insert PO lines if provided
    if (lines && Array.isArray(lines) && lines.length > 0) {
      const poLines = lines.map((line: any) => ({
        ...line,
        purchase_order_id: newPO.id,
        brand_id: newPO.brand_id,
        created_by: user.id,
        updated_by: user.id,
      }));

      const { error: linesError } = await supabase
        .from("purchase_order_lines")
        .insert(poLines);

      if (linesError) {
        console.error("Error creating PO lines:", linesError);
        // Don't fail the whole request, just log the error
      }
    }

    // Trigger role-based notifications
    // This will notify brand_admin, brand_logistics, brand_reviewer, and super_admin
    // based on their settings in notification_role_settings
    try {
      console.log(`[PO Creation] Starting notifications for PO ${newPO.po_number} with status: ${newPO.po_status}, brand: ${newPO.brand_id}`);
      
      // Notify relevant users that a new PO has been created
      await createPOCreatedAlert(
        newPO.id,
        newPO.po_number,
        newPO.brand_id,
        user.id // Exclude the creator from notifications
      );

      // If the PO is submitted for approval (not in draft), also send approval alert
      if (newPO.po_status !== "draft") {
        console.log(`[PO Creation] Sending approval alert for PO ${newPO.po_number} (status: ${newPO.po_status})`);
        await createPOApprovalAlert(
          newPO.id,
          newPO.po_number,
          newPO.brand_id,
          user.id // Exclude the submitter
        );
      } else {
        console.log(`[PO Creation] Skipping approval alert for PO ${newPO.po_number} (status: draft)`);
      }
      
      console.log(`[PO Creation] Notifications completed for PO ${newPO.po_number}`);
    } catch (notifError) {
      console.error(`[PO Creation] Error sending PO notifications for ${newPO.po_number}:`, notifError);
      // Don't fail the PO creation if notifications fail
    }

    return NextResponse.json({ 
      purchaseOrder: newPO,
      message: "Purchase order created successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
