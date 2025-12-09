import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UpdateRelationshipData } from "@/types/relationships";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: relationship, error } = await supabase
      .from("brand_distributor_relationships_detailed")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Relationship not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching relationship:", error);
      return NextResponse.json(
        { error: "Failed to fetch relationship" },
        { status: 500 }
      );
    }

    return NextResponse.json({ relationship });
  } catch (error) {
    console.error("Unexpected error in relationship GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get existing relationship to check permissions
    const { data: existingRelationship } = await supabase
      .from("brand_distributor_relationships")
      .select("*")
      .eq("id", id)
      .single();

    if (!existingRelationship) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const canManageRelationship = 
      profile.role_name === "super_admin" || 
      (profile.role_name?.startsWith("brand_") && profile.brand_id === existingRelationship.brand_id);

    if (!canManageRelationship) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body: UpdateRelationshipData = await request.json();

    // Prepare update data
    const updateData = {
      ...body,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateRelationshipData] === undefined) {
        delete updateData[key as keyof UpdateRelationshipData];
      }
    });

    const { data: updatedRelationship, error: updateError } = await supabase
      .from("brand_distributor_relationships")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating relationship:", updateError);
      return NextResponse.json(
        { error: "Failed to update relationship" },
        { status: 500 }
      );
    }

    // Fetch the detailed relationship data
    const { data: detailedRelationship } = await supabase
      .from("brand_distributor_relationships_detailed")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({
      message: "Relationship updated successfully",
      relationship: detailedRelationship
    });

  } catch (error) {
    console.error("Unexpected error in relationship PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get existing relationship to check permissions
    const { data: existingRelationship } = await supabase
      .from("brand_distributor_relationships")
      .select("*")
      .eq("id", id)
      .single();

    if (!existingRelationship) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }

    // Check permissions - only super_admin can delete relationships
    if (profile.role_name !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can delete relationships" }, { status: 403 });
    }

    // Get termination reason from request body
    const body = await request.json().catch(() => ({}));
    const terminationReason = body.reason || "Relationship terminated by admin";

    // Instead of hard delete, update to terminated status
    const { error: updateError } = await supabase
      .from("brand_distributor_relationships")
      .update({
        status: "terminated",
        termination_reason: terminationReason,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error terminating relationship:", updateError);
      return NextResponse.json(
        { error: "Failed to terminate relationship" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Relationship terminated successfully"
    });

  } catch (error) {
    console.error("Unexpected error in relationship DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}