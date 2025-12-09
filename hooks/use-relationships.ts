import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BrandDistributorRelationshipDetailed,
  RelationshipFilters,
  CreateRelationshipData,
  UpdateRelationshipData,
  RelationshipBulkOperation,
  RelationshipsResponse,
  UseRelationshipsResult,
  RelationshipSort
} from "@/types/relationships";

interface UseRelationshipsOptions {
  filters?: RelationshipFilters;
  sort?: RelationshipSort;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useRelationships(options: UseRelationshipsOptions = {}): UseRelationshipsResult {
  const queryClient = useQueryClient();
  const {
    filters = {},
    sort = { field: "created_at", direction: "desc" },
    page = 1,
    limit = 20,
    enabled = true
  } = options;

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("sort", sort.field);
    params.set("direction", sort.direction);

    if (filters.brand_ids?.length) {
      params.set("brand_ids", filters.brand_ids.join(","));
    }
    
    if (filters.distributor_ids?.length) {
      params.set("distributor_ids", filters.distributor_ids.join(","));
    }
    
    if (filters.status?.length) {
      params.set("status", filters.status.join(","));
    }
    
    if (filters.territory_priority?.length) {
      params.set("territory_priority", filters.territory_priority.join(","));
    }
    
    if (filters.assigned_territories?.length) {
      params.set("territories", filters.assigned_territories.join(","));
    }
    
    if (filters.min_revenue !== undefined) {
      params.set("min_revenue", filters.min_revenue.toString());
    }
    
    if (filters.max_revenue !== undefined) {
      params.set("max_revenue", filters.max_revenue.toString());
    }
    
    if (filters.min_orders !== undefined) {
      params.set("min_orders", filters.min_orders.toString());
    }
    
    if (filters.max_orders !== undefined) {
      params.set("max_orders", filters.max_orders.toString());
    }
    
    if (filters.search_term) {
      params.set("search", filters.search_term);
    }

    return params.toString();
  };

  // Fetch relationships query
  const {
    data: relationshipsData,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["relationships", { filters, sort, page, limit }],
    queryFn: async (): Promise<RelationshipsResponse> => {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/relationships?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Create relationship mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateRelationshipData) => {
      const response = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create relationship");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast.success("Relationship created successfully");
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["relationship-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create relationship: ${error.message}`);
    },
  });

  // Update relationship mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRelationshipData }) => {
      const response = await fetch(`/api/relationships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update relationship");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast.success("Relationship updated successfully");
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["relationship-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update relationship: ${error.message}`);
    },
  });

  // Delete relationship mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await fetch(`/api/relationships/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to terminate relationship");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success("Relationship terminated successfully");
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["relationship-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to terminate relationship: ${error.message}`);
    },
  });

  // Bulk operations mutation
  const bulkMutation = useMutation({
    mutationFn: async (operation: RelationshipBulkOperation) => {
      const response = await fetch("/api/relationships/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to perform bulk operation");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast.success(`Bulk operation completed: ${result.updated_count} relationships updated`);
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["relationship-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Bulk operation failed: ${error.message}`);
    },
  });

  return {
    relationships: relationshipsData?.data || [],
    loading: isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: error?.message || null,
    total: relationshipsData?.total || 0,
    page: relationshipsData?.page || 1,
    totalPages: relationshipsData?.total_pages || 1,
    refetch,
    createRelationship: createMutation.mutateAsync,
    updateRelationship: (id: string, data: UpdateRelationshipData) =>
      updateMutation.mutateAsync({ id, data }),
    deleteRelationship: (id: string, reason?: string) =>
      deleteMutation.mutateAsync({ id, reason }),
    bulkOperation: bulkMutation.mutateAsync,
  };
}

// Hook for relationship statistics
export function useRelationshipStats(enabled = true) {
  return useQuery({
    queryKey: ["relationship-stats"],
    queryFn: async () => {
      const response = await fetch("/api/relationships/stats");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

// Hook for individual relationship
export function useRelationship(id: string, enabled = true) {
  const queryClient = useQueryClient();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["relationship", id],
    queryFn: async (): Promise<{ relationship: BrandDistributorRelationshipDetailed }> => {
      const response = await fetch(`/api/relationships/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: enabled && !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Update relationship mutation
  const updateMutation = useMutation({
    mutationFn: async (updateData: UpdateRelationshipData) => {
      const response = await fetch(`/api/relationships/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update relationship");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success("Relationship updated successfully");
      queryClient.invalidateQueries({ queryKey: ["relationship", id] });
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["relationship-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update relationship: ${error.message}`);
    },
  });

  return {
    relationship: data?.relationship || null,
    loading: isLoading || updateMutation.isPending,
    error: error?.message || null,
    refetch,
    updateRelationship: updateMutation.mutateAsync,
  };
}

// Hook for relationship history
export function useRelationshipHistory(relationshipId: string, enabled = true) {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["relationship-history", relationshipId, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      const response = await fetch(`/api/relationships/${relationshipId}/history?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: enabled && !!relationshipId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  return {
    history: data?.history || [],
    loading: isLoading,
    error: error?.message || null,
    total: data?.total || 0,
    page,
    totalPages: data?.total_pages || 1,
    setPage,
    refetch,
  };
}

// Hook for creating multiple relationships (bulk assign)
export function useBulkAssignDistributors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationships: CreateRelationshipData[]) => {
      const promises = relationships.map(data =>
        fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(
        responses.map(async (response, index) => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(
              `Failed to create relationship ${index + 1}: ${error.error || "Unknown error"}`
            );
          }
          return response.json();
        })
      );

      return results;
    },
    onSuccess: (results) => {
      toast.success(`Successfully created ${results.length} relationship(s)`);
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["relationship-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Bulk assignment failed: ${error.message}`);
    },
  });
}