import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  BrandDistributorRelationshipDetailed, 
  RelationshipFilters, 
  CreateRelationshipData,
  RelationshipsResponse,
  RelationshipStats
} from "@/types/relationships";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortField = searchParams.get("sort") || "created_at";
    const sortDirection = searchParams.get("direction") || "desc";
    
    // Build filters
    const filters: RelationshipFilters = {
      brand_ids: searchParams.get("brand_ids")?.split(",").filter(Boolean),
      distributor_ids: searchParams.get("distributor_ids")?.split(",").filter(Boolean),
      status: searchParams.get("status")?.split(",").filter(Boolean) as any[],
      territory_priority: searchParams.get("territory_priority")?.split(",").filter(Boolean) as any[],
      assigned_territories: searchParams.get("territories")?.split(",").filter(Boolean),
      min_revenue: searchParams.get("min_revenue") ? parseFloat(searchParams.get("min_revenue")!) : undefined,
      max_revenue: searchParams.get("max_revenue") ? parseFloat(searchParams.get("max_revenue")!) : undefined,
      min_orders: searchParams.get("min_orders") ? parseInt(searchParams.get("min_orders")!) : undefined,
      max_orders: searchParams.get("max_orders") ? parseInt(searchParams.get("max_orders")!) : undefined,
      search_term: searchParams.get("search") || undefined,
    };

    // Build query
    let query = supabase
      .from("brand_distributor_relationships_detailed")
      .select("*", { count: "exact" });

    // Apply filters
    if (filters.brand_ids?.length) {
      query = query.in("brand_id", filters.brand_ids);
    }
    
    if (filters.distributor_ids?.length) {
      query = query.in("distributor_id", filters.distributor_ids);
    }
    
    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }
    
    if (filters.territory_priority?.length) {
      query = query.in("territory_priority", filters.territory_priority);
    }
    
    if (filters.assigned_territories?.length) {
      query = query.overlaps("assigned_territories", filters.assigned_territories);
    }
    
    if (filters.min_revenue !== undefined) {
      query = query.gte("total_revenue", filters.min_revenue);
    }
    
    if (filters.max_revenue !== undefined) {
      query = query.lte("total_revenue", filters.max_revenue);
    }
    
    if (filters.min_orders !== undefined) {
      query = query.gte("total_orders", filters.min_orders);
    }
    
    if (filters.max_orders !== undefined) {
      query = query.lte("total_orders", filters.max_orders);
    }

    // Apply search
    if (filters.search_term) {
      query = query.or(`brand_name.ilike.%${filters.search_term}%,distributor_name.ilike.%${filters.search_term}%,distributor_company.ilike.%${filters.search_term}%`);
    }

    // Apply sorting and pagination
    const offset = (page - 1) * limit;
    query = query
      .order(sortField, { ascending: sortDirection === "asc" })
      .range(offset, offset + limit - 1);

    const { data: relationships, error, count } = await query;

    if (error) {
      console.error("Error fetching relationships:", error);
      return NextResponse.json(
        { error: "Failed to fetch relationships" },
        { status: 500 }
      );
    }

    const response: RelationshipsResponse = {
      data: relationships || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in relationships GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Check permissions - only super_admin and brand_admin can create relationships
    const canManageRelationships = 
      profile.role_name === "super_admin" || 
      profile.role_name?.startsWith("brand_");

    if (!canManageRelationships) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body: CreateRelationshipData = await request.json();

    // Validate required fields
    if (!body.brand_id || !body.distributor_id) {
      return NextResponse.json(
        { error: "brand_id and distributor_id are required" },
        { status: 400 }
      );
    }

    // For brand admins, ensure they can only create relationships for their brand
    if (profile.role_name?.startsWith("brand_") && profile.brand_id !== body.brand_id) {
      return NextResponse.json(
        { error: "Cannot create relationship for other brands" },
        { status: 403 }
      );
    }

    // Check if relationship already exists
    const { data: existingRelationship } = await supabase
      .from("brand_distributor_relationships")
      .select("id")
      .eq("brand_id", body.brand_id)
      .eq("distributor_id", body.distributor_id)
      .single();

    if (existingRelationship) {
      return NextResponse.json(
        { error: "Relationship already exists between this brand and distributor" },
        { status: 409 }
      );
    }

    // Validate brand and distributor exist
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("id", body.brand_id)
      .single();

    const { data: distributor } = await supabase
      .from("distributors")
      .select("id")
      .eq("id", body.distributor_id)
      .single();

    if (!brand || !distributor) {
      return NextResponse.json(
        { error: "Invalid brand_id or distributor_id" },
        { status: 400 }
      );
    }

    // Create relationship
    const relationshipData = {
      brand_id: body.brand_id,
      distributor_id: body.distributor_id,
      status: body.status || "pending",
      territory_priority: body.territory_priority || "primary",
      assigned_territories: body.assigned_territories || [],
      commission_rate: body.commission_rate,
      contract_start_date: body.contract_start_date,
      contract_end_date: body.contract_end_date,
      minimum_order_value: body.minimum_order_value,
      credit_limit: body.credit_limit,
      payment_terms: body.payment_terms,
      shipping_terms: body.shipping_terms,
      exclusive_territories: body.exclusive_territories || false,
      created_by: user.id,
    };

    const { data: relationship, error: createError } = await supabase
      .from("brand_distributor_relationships")
      .insert(relationshipData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating relationship:", createError);
      return NextResponse.json(
        { error: "Failed to create relationship" },
        { status: 500 }
      );
    }

    // Fetch the detailed relationship data
    const { data: detailedRelationship } = await supabase
      .from("brand_distributor_relationships_detailed")
      .select("*")
      .eq("id", relationship.id)
      .single();

    return NextResponse.json({ 
      message: "Relationship created successfully",
      relationship: detailedRelationship 
    }, { status: 201 });

  } catch (error) {
    console.error("Unexpected error in relationships POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}