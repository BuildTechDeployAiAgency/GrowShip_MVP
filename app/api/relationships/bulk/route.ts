import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RelationshipBulkOperation } from "@/types/relationships";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Check permissions - only super_admin and brand_admin can perform bulk operations
    const canPerformBulkOps = 
      profile.role_name === "super_admin" || 
      profile.role_name?.startsWith("brand_");

    if (!canPerformBulkOps) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body: RelationshipBulkOperation = await request.json();

    // Validate required fields
    if (!body.relationship_ids?.length || !body.operation) {
      return NextResponse.json(
        { error: "relationship_ids and operation are required" },
        { status: 400 }
      );
    }

    // Get existing relationships to validate permissions
    const { data: existingRelationships, error: fetchError } = await supabase
      .from("brand_distributor_relationships")
      .select("id, brand_id, distributor_id, status")
      .in("id", body.relationship_ids);

    if (fetchError || !existingRelationships) {
      console.error("Error fetching relationships for bulk operation:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch relationships" },
        { status: 500 }
      );
    }

    // For brand admins, ensure they can only modify relationships for their brand
    if (profile.role_name?.startsWith("brand_") && profile.brand_id) {
      const unauthorizedRelationships = existingRelationships.filter(
        rel => rel.brand_id !== profile.brand_id
      );
      
      if (unauthorizedRelationships.length > 0) {
        return NextResponse.json(
          { error: "Cannot modify relationships for other brands" },
          { status: 403 }
        );
      }
    }

    let updateData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Handle different bulk operations
    switch (body.operation) {
      case 'activate':
        updateData.status = 'active';
        if (body.reason) {
          updateData.suspended_reason = null;
          updateData.termination_reason = null;
        }
        break;

      case 'suspend':
        updateData.status = 'suspended';
        if (body.reason) {
          updateData.suspended_reason = body.reason;
        }
        break;

      case 'terminate':
        updateData.status = 'terminated';
        if (body.reason) {
          updateData.termination_reason = body.reason;
        }
        break;

      case 'update_territories':
        if (body.data?.assigned_territories) {
          updateData.assigned_territories = body.data.assigned_territories;
        }
        if (body.data?.territory_priority) {
          updateData.territory_priority = body.data.territory_priority;
        }
        if (body.data?.exclusive_territories !== undefined) {
          updateData.exclusive_territories = body.data.exclusive_territories;
        }
        break;

      case 'update_commission':
        if (body.data?.commission_rate !== undefined) {
          updateData.commission_rate = body.data.commission_rate;
        }
        if (body.data?.payment_terms) {
          updateData.payment_terms = body.data.payment_terms;
        }
        if (body.data?.minimum_order_value !== undefined) {
          updateData.minimum_order_value = body.data.minimum_order_value;
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid operation type" },
          { status: 400 }
        );
    }

    // Perform bulk update
    const { data: updatedRelationships, error: updateError } = await supabase
      .from("brand_distributor_relationships")
      .update(updateData)
      .in("id", body.relationship_ids)
      .select();

    if (updateError) {
      console.error("Error performing bulk update:", updateError);
      return NextResponse.json(
        { error: "Failed to perform bulk operation" },
        { status: 500 }
      );
    }

    // If reason provided, create history entries
    if (body.reason) {
      const historyEntries = body.relationship_ids.map(relationshipId => ({
        relationship_id: relationshipId,
        change_type: 'updated',
        change_reason: body.reason,
        new_values: updateData,
        changed_by: user.id
      }));

      await supabase
        .from("brand_distributor_relationship_history")
        .insert(historyEntries);
    }

    return NextResponse.json({
      message: `Bulk ${body.operation} operation completed successfully`,
      updated_count: updatedRelationships?.length || 0,
      relationships: updatedRelationships
    });

  } catch (error) {
    console.error("Unexpected error in bulk relationships POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}