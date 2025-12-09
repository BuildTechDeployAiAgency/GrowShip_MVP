import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RelationshipStatsResponse, RelationshipStats, TerritoryConflict } from "@/types/relationships";

export async function GET(request: NextRequest) {
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

    // Check permissions - only super_admin and brand_admin can view stats
    const canViewStats = 
      profile.role_name === "super_admin" || 
      profile.role_name?.startsWith("brand_");

    if (!canViewStats) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Build base query for user's access level
    let relationshipsQuery = supabase
      .from("brand_distributor_relationships_detailed")
      .select("*");

    // Filter for brand admins
    if (profile.role_name?.startsWith("brand_") && profile.brand_id) {
      relationshipsQuery = relationshipsQuery.eq("brand_id", profile.brand_id);
    }

    const { data: relationships, error: relationshipsError } = await relationshipsQuery;

    if (relationshipsError) {
      console.error("Error fetching relationships for stats:", relationshipsError);
      return NextResponse.json(
        { error: "Failed to fetch relationships" },
        { status: 500 }
      );
    }

    // Calculate basic stats
    const totalRelationships = relationships?.length || 0;
    const activeRelationships = relationships?.filter(r => r.status === 'active').length || 0;
    const pendingRelationships = relationships?.filter(r => r.status === 'pending').length || 0;
    const suspendedRelationships = relationships?.filter(r => r.status === 'suspended').length || 0;
    const terminatedRelationships = relationships?.filter(r => r.status === 'terminated').length || 0;
    
    const totalRevenue = relationships?.reduce((sum, r) => sum + (r.total_revenue || 0), 0) || 0;
    const totalOrders = relationships?.reduce((sum, r) => sum + (r.total_orders || 0), 0) || 0;
    
    const ratingsSum = relationships?.reduce((sum, r) => sum + (r.performance_rating || 0), 0) || 0;
    const ratingsCount = relationships?.filter(r => r.performance_rating).length || 0;
    const averagePerformanceRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    // Find expiring contracts (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringContracts = relationships?.filter(r => {
      if (!r.contract_end_date) return false;
      const contractEndDate = new Date(r.contract_end_date);
      return contractEndDate <= thirtyDaysFromNow && contractEndDate > new Date();
    }) || [];

    const stats: RelationshipStats = {
      total_relationships: totalRelationships,
      active_relationships: activeRelationships,
      pending_relationships: pendingRelationships,
      suspended_relationships: suspendedRelationships,
      terminated_relationships: terminatedRelationships,
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      average_performance_rating: averagePerformanceRating,
      expiring_contracts_count: expiringContracts.length
    };

    // Find territory conflicts
    const territoryConflicts: TerritoryConflict[] = [];
    const territoryMap = new Map<string, any[]>();

    // Group relationships by territory
    relationships?.forEach(relationship => {
      if (relationship.assigned_territories) {
        relationship.assigned_territories.forEach((territory: string) => {
          if (!territoryMap.has(territory)) {
            territoryMap.set(territory, []);
          }
          territoryMap.get(territory)!.push({
            id: relationship.id,
            brand_name: relationship.brand_name,
            distributor_name: relationship.distributor_name,
            priority: relationship.territory_priority,
            exclusive: relationship.exclusive_territories,
            status: relationship.status
          });
        });
      }
    });

    // Find conflicts (multiple active relationships in same territory)
    territoryMap.forEach((relationshipsInTerritory, territory) => {
      const activeRels = relationshipsInTerritory.filter(r => r.status === 'active');
      
      if (activeRels.length > 1) {
        // Check for exclusive territory conflicts
        const exclusiveRels = activeRels.filter(r => r.exclusive);
        const hasConflict = exclusiveRels.length > 0 && activeRels.length > 1;
        
        if (hasConflict) {
          territoryConflicts.push({
            territory,
            conflicting_relationships: activeRels
          });
        }
      }
    });

    const response: RelationshipStatsResponse = {
      stats,
      territory_conflicts: territoryConflicts,
      expiring_contracts: expiringContracts
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in relationship stats GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}