import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SalesTarget {
  id: string;
  brand_id: string;
  sku: string;
  target_period: string;
  period_type: "monthly" | "quarterly" | "yearly";
  target_quantity?: number;
  target_revenue?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface UseTargetsOptions {
  sku?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function useTargets(options: UseTargetsOptions = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["targets", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.sku) params.append("sku", options.sku);
      if (options.periodType) params.append("period_type", options.periodType);
      if (options.startDate) params.append("start_date", options.startDate);
      if (options.endDate) params.append("end_date", options.endDate);
      if (options.limit) params.append("limit", String(options.limit));

      const response = await fetch(`/api/targets?${params}`);
      if (!response.ok) throw new Error("Failed to fetch targets");
      return response.json();
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (target: Partial<SalesTarget>) => {
      const response = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create target");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      queryClient.invalidateQueries({ queryKey: ["target-vs-actual"] });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesTarget> & { id: string }) => {
      const response = await fetch(`/api/targets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update target");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      queryClient.invalidateQueries({ queryKey: ["target-vs-actual"] });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/targets/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete target");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      queryClient.invalidateQueries({ queryKey: ["target-vs-actual"] });
    },
  });

  return {
    targets: data?.targets || [],
    total: data?.total || 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    createTarget: createTargetMutation.mutateAsync,
    updateTarget: updateTargetMutation.mutateAsync,
    deleteTarget: deleteTargetMutation.mutateAsync,
  };
}


