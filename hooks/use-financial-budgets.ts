import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import type { 
  FinancialBudget, 
  CreateBudgetRequest, 
  UpdateBudgetRequest, 
  FinancialFilters,
  FinancialListResponse 
} from '@/types/financial';
import { toast } from 'sonner';

interface UseBudgetsOptions {
  filters?: FinancialFilters;
  enabled?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseBudgetsReturn {
  data: FinancialListResponse<FinancialBudget> | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
  createBudget: (data: CreateBudgetRequest) => Promise<FinancialBudget>;
  updateBudget: (data: UpdateBudgetRequest) => Promise<FinancialBudget>;
  deleteBudget: (budgetId: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useBudgets({
  filters = {},
  enabled = true,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  sortOrder = 'desc',
}: UseBudgetsOptions = {}): UseBudgetsReturn {
  const { user, profile } = useEnhancedAuth();
  const queryClient = useQueryClient();

  // Fetch budgets
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['financial-budgets', filters, profile?.role_name, profile?.brand_id, profile?.distributor_id, page, limit, sortBy, sortOrder],
    queryFn: () => fetchBudgets(filters, page, limit, sortBy, sortOrder),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error && 'status' in error && [403, 404].includes(error.status as number)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: (budgetData: CreateBudgetRequest) => createBudget(budgetData),
    onSuccess: (newBudget) => {
      queryClient.invalidateQueries({ queryKey: ['financial-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast.success('Budget created successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create budget';
      toast.error(message);
    },
  });

  // Update budget mutation
  const updateMutation = useMutation({
    mutationFn: (budgetData: UpdateBudgetRequest) => updateBudget(budgetData),
    onSuccess: (updatedBudget) => {
      queryClient.invalidateQueries({ queryKey: ['financial-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['financial-budget', updatedBudget.id] });
      toast.success('Budget updated successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update budget';
      toast.error(message);
    },
  });

  // Delete budget mutation
  const deleteMutation = useMutation({
    mutationFn: (budgetId: string) => deleteBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      toast.success('Budget deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete budget';
      toast.error(message);
    },
  });

  return {
    data: data || null,
    isLoading,
    error,
    refetch,
    isRefetching,
    createBudget: createMutation.mutateAsync,
    updateBudget: updateMutation.mutateAsync,
    deleteBudget: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Individual budget hook
interface UseBudgetOptions {
  budgetId: string;
  enabled?: boolean;
}

interface UseBudgetReturn {
  data: FinancialBudget | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBudget({ budgetId, enabled = true }: UseBudgetOptions): UseBudgetReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-budget', budgetId],
    queryFn: () => fetchBudget(budgetId),
    enabled: enabled && !!user && !!profile && !!budgetId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error && 'status' in error && [403, 404].includes(error.status as number)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    data: data || null,
    isLoading,
    error,
    refetch,
  };
}

// API functions
async function fetchBudgets(
  filters: FinancialFilters,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string
): Promise<FinancialListResponse<FinancialBudget>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
  });

  // Add filters
  if (filters.brandId) params.append('brandId', filters.brandId);
  if (filters.distributorId) params.append('distributorId', filters.distributorId);
  if (filters.fiscalYear) params.append('fiscalYear', filters.fiscalYear.toString());
  if (filters.status) params.append('status', filters.status.join(','));
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/financial/budgets?${params.toString()}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchBudget(budgetId: string): Promise<FinancialBudget> {
  const response = await fetch(`/api/financial/budgets/${budgetId}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function createBudget(budgetData: CreateBudgetRequest): Promise<FinancialBudget> {
  const response = await fetch('/api/financial/budgets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(budgetData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP ${response.status}`;
    
    // Include validation errors if available
    if (errorData.validationErrors) {
      const validationMessages = errorData.validationErrors.map((err: any) => err.message).join(', ');
      throw new Error(`${errorMessage}: ${validationMessages}`);
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

async function updateBudget(budgetData: UpdateBudgetRequest): Promise<FinancialBudget> {
  const { id, ...updateFields } = budgetData;
  
  const response = await fetch(`/api/financial/budgets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateFields),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP ${response.status}`;
    
    if (errorData.validationErrors) {
      const validationMessages = errorData.validationErrors.map((err: any) => err.message).join(', ');
      throw new Error(`${errorMessage}: ${validationMessages}`);
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

async function deleteBudget(budgetId: string): Promise<void> {
  const response = await fetch(`/api/financial/budgets/${budgetId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP ${response.status}`;
    
    if (errorData.validationErrors) {
      const validationMessages = errorData.validationErrors.map((err: any) => err.message).join(', ');
      throw new Error(`${errorMessage}: ${validationMessages}`);
    }
    
    throw new Error(errorMessage);
  }
}