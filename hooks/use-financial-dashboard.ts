import { useQuery } from '@tanstack/react-query';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import type { FinancialDashboardMetrics, FinancialFilters } from '@/types/financial';

interface UseFinancialDashboardOptions {
  filters?: FinancialFilters;
  enabled?: boolean;
  initialData?: FinancialDashboardMetrics;
}

interface UseFinancialDashboardReturn {
  data: FinancialDashboardMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
}

export function useFinancialDashboard({
  filters = {},
  enabled = true,
  initialData,
}: UseFinancialDashboardOptions = {}): UseFinancialDashboardReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['financial-dashboard', filters, profile?.role_name, profile?.brand_id, profile?.distributor_id],
    queryFn: () => fetchFinancialDashboard(filters, profile?.role_name, profile?.brand_id, profile?.distributor_id),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry if it's a 403/404 error
      if (error && 'status' in error && [403, 404].includes(error.status as number)) {
        return false;
      }
      return failureCount < 2;
    },
    initialData,
  });

  return {
    data: data || null,
    isLoading,
    error,
    refetch,
    isRefetching,
  };
}

async function fetchFinancialDashboard(
  filters: FinancialFilters,
  userRole?: string,
  brandId?: string,
  distributorId?: string
): Promise<FinancialDashboardMetrics> {
  const params = new URLSearchParams();
  
  // Add filters to params
  if (filters.brandId) params.append('brandId', filters.brandId);
  if (filters.distributorId) params.append('distributorId', filters.distributorId);
  if (filters.fiscalYear) params.append('fiscalYear', filters.fiscalYear.toString());
  if (filters.period) params.append('period', filters.period);

  const response = await fetch(`/api/financial/analytics?${params.toString()}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}