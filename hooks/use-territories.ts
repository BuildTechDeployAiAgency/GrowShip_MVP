"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { Region, Territory, TerritoryWithMetrics } from "@/types/geography";

interface UseTerritoriesOptions {
  brandId?: string;
  includeMetrics?: boolean;
  enabled?: boolean;
}

interface UseTerritoriesReturn {
  territories: TerritoryWithMetrics[];
  regions: Region[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createTerritory: (territory: Partial<Territory>) => Promise<Territory>;
  updateTerritory: (id: string, updates: Partial<Territory>) => Promise<void>;
  deleteTerritory: (id: string) => Promise<void>;
}

/**
 * Fetch all regions (reference data)
 */
async function fetchRegions(): Promise<Region[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  
  if (error) {
    throw error;
  }
  
  return data || [];
}

/**
 * Fetch territories with optional metrics
 */
async function fetchTerritories(
  brandId?: string,
  includeMetrics?: boolean
): Promise<TerritoryWithMetrics[]> {
  const supabase = createClient();
  
  if (includeMetrics) {
    // Use RPC function that includes metrics
    const { data, error } = await supabase.rpc("get_territory_details", {
      p_brand_id: brandId || null,
    });
    
    if (error) {
      console.error("Error fetching territory details:", error);
      // Fall back to basic query
      return fetchBasicTerritories(brandId);
    }
    
    return data || [];
  }
  
  return fetchBasicTerritories(brandId);
}

/**
 * Basic territories fetch without metrics
 */
async function fetchBasicTerritories(brandId?: string): Promise<TerritoryWithMetrics[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("territories")
    .select(`
      *,
      region:regions(id, name, code)
    `)
    .eq("is_active", true)
    .order("display_order");
  
  // Include both global territories and brand-specific ones
  if (brandId) {
    query = query.or(`brand_id.is.null,brand_id.eq.${brandId}`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return (data || []).map((t) => ({
    ...t,
    region_name: t.region?.name,
    region_code: t.region?.code,
    total_revenue: 0,
    distributor_count: 0,
    order_count: 0,
  }));
}

export function useTerritories({
  brandId,
  includeMetrics = false,
  enabled = true,
}: UseTerritoriesOptions = {}): UseTerritoriesReturn {
  const queryClient = useQueryClient();
  
  // Fetch regions
  const {
    data: regions,
    isLoading: regionsLoading,
    error: regionsError,
  } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch territories
  const {
    data: territories,
    isLoading: territoriesLoading,
    error: territoriesError,
    refetch,
  } = useQuery({
    queryKey: ["territories", brandId, includeMetrics],
    queryFn: () => fetchTerritories(brandId, includeMetrics),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - territory data is relatively static
    refetchOnWindowFocus: false,
  });
  
  // Create territory mutation
  const createMutation = useMutation({
    mutationFn: async (territory: Partial<Territory>): Promise<Territory> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("territories")
        .insert({
          ...territory,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      toast.success("Territory created successfully!");
    },
    onError: (error: Error) => {
      console.error("Error creating territory:", error);
      toast.error(error.message || "Failed to create territory");
    },
  });
  
  // Update territory mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Territory>;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("territories")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      toast.success("Territory updated successfully!");
    },
    onError: (error: Error) => {
      console.error("Error updating territory:", error);
      toast.error(error.message || "Failed to update territory");
    },
  });
  
  // Delete territory mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      
      const { error } = await supabase
        .from("territories")
        .delete()
        .eq("id", id);
      
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      toast.success("Territory deleted successfully!");
    },
    onError: (error: Error) => {
      console.error("Error deleting territory:", error);
      toast.error(error.message || "Failed to delete territory");
    },
  });
  
  const error = regionsError || territoriesError;
  
  return {
    territories: territories || [],
    regions: regions || [],
    loading: regionsLoading || territoriesLoading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
    createTerritory: async (territory) => createMutation.mutateAsync(territory),
    updateTerritory: async (id, updates) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteTerritory: async (id) => deleteMutation.mutateAsync(id),
  };
}

/**
 * Hook to get territory options for select dropdowns
 */
export function useTerritoryOptions(brandId?: string) {
  const { territories, regions, loading, error } = useTerritories({
    brandId,
    includeMetrics: false,
  });
  
  // Group territories by region for organized dropdowns
  const groupedTerritories = regions.map((region) => ({
    label: region.name,
    options: territories
      .filter((t) => t.region_id === region.id)
      .map((t) => ({
        value: t.id,
        label: t.name,
        code: t.code,
        countries: t.countries,
      })),
  }));
  
  // Flat list for simple selects
  const territoryOptions = territories.map((t) => ({
    value: t.id,
    label: t.name,
    code: t.code,
    regionName: t.region_name,
  }));
  
  const regionOptions = regions.map((r) => ({
    value: r.id,
    label: r.name,
    code: r.code,
  }));
  
  return {
    groupedTerritories,
    territoryOptions,
    regionOptions,
    loading,
    error,
  };
}

