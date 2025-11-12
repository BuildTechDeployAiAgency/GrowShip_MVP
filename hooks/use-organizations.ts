import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "@/types/auth";

interface UseOrganizationsOptions {
  enabled?: boolean;
  includeInactive?: boolean;
}

export function useOrganizations({
  enabled = true,
  includeInactive = false,
}: UseOrganizationsOptions = {}) {
  const supabase = createClient();

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["organizations", includeInactive],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("brands")
        .select("id, name, slug, organization_type, is_active")
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []) as Brand[];
    },
  });

  return {
    organizations: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}

