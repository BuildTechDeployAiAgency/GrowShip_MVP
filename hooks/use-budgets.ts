"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import type { FinancialBudget, CreateBudgetRequest, UpdateBudgetRequest, FinancialFilters } from '@/types/financial';

const supabase = createClient();

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  list: (filters: FinancialFilters) => [...budgetKeys.lists(), filters] as const,
  details: () => [...budgetKeys.all, 'detail'] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
};

export function useBudgets(filters?: FinancialFilters) {
  const { profile } = useEnhancedAuth();
  
  return useQuery({
    queryKey: budgetKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('financial_budgets')
        .select(`
          *,
          budget_categories (
            id,
            name,
            category_type
          ),
          budget_allocations (
            id,
            allocated_amount,
            spent_amount,
            target_name
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.brandId || profile?.brand_id) {
        query = query.eq('brand_id', filters?.brandId || profile?.brand_id);
      }
      
      if (filters?.distributorId) {
        query = query.eq('distributor_id', filters.distributorId);
      }
      
      if (filters?.fiscalYear) {
        query = query.eq('fiscal_year', filters.fiscalYear);
      }
      
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      
      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        query = query.in('budget_category_id', filters.categoryIds);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('period_start_date', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('period_end_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FinancialBudget[];
    },
    enabled: !!profile,
  });
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_budgets')
        .select(`
          *,
          budget_categories (
            id,
            name,
            category_type
          ),
          budget_allocations (
            *
          ),
          expense_approvals (
            *
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as FinancialBudget;
    },
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { profile } = useEnhancedAuth();
  
  return useMutation({
    mutationFn: async (data: CreateBudgetRequest) => {
      const budgetData = {
        ...data,
        brand_id: data.brandId || profile?.brand_id,
        status: 'draft',
        approval_status: 'pending',
        spent_amount: 0,
        committed_amount: 0,
        remaining_amount: data.plannedAmount,
        variance_amount: 0,
        variance_percentage: 0,
        exchange_rate: 1,
        base_currency_amount: data.plannedAmount,
        version_number: 1,
        alert_threshold_percentage: 80,
        critical_threshold_percentage: 95,
        is_rollover_budget: false,
        auto_allocate: false,
        created_by: profile?.user_id,
      };

      const { data: newBudget, error } = await supabase
        .from('financial_budgets')
        .insert([budgetData])
        .select()
        .single();

      if (error) throw error;
      return newBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { profile } = useEnhancedAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBudgetRequest) => {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // If status is being updated to approved
      if (data.approvalStatus === 'approved') {
        updateData.approved_by = profile?.user_id;
        updateData.approved_at = new Date().toISOString();
        updateData.status = 'active';
      }

      const { data: updatedBudget, error } = await supabase
        .from('financial_budgets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedBudget;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(data.id) });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useBudgetMetrics(filters?: FinancialFilters) {
  const { profile } = useEnhancedAuth();
  
  return useQuery({
    queryKey: ['budget-metrics', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_budgets')
        .select('*');

      if (filters?.brandId || profile?.brand_id) {
        query = query.eq('brand_id', filters?.brandId || profile?.brand_id);
      }
      
      if (filters?.fiscalYear) {
        query = query.eq('fiscal_year', filters.fiscalYear);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Calculate metrics
      const totalBudgets = data?.length || 0;
      const totalPlanned = data?.reduce((sum, b) => sum + b.planned_amount, 0) || 0;
      const totalAllocated = data?.reduce((sum, b) => sum + b.allocated_amount, 0) || 0;
      const totalSpent = data?.reduce((sum, b) => sum + b.spent_amount, 0) || 0;
      const totalRemaining = data?.reduce((sum, b) => sum + b.remaining_amount, 0) || 0;
      const overBudgetCount = data?.filter(b => b.spent_amount > b.planned_amount).length || 0;
      const alertCount = data?.filter(b => 
        (b.spent_amount / b.planned_amount) * 100 >= b.alert_threshold_percentage
      ).length || 0;

      return {
        totalBudgets,
        totalPlannedAmount: totalPlanned,
        totalAllocatedAmount: totalAllocated,
        totalSpentAmount: totalSpent,
        totalRemainingAmount: totalRemaining,
        averageUtilization: totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0,
        overBudgetCount,
        alertCount,
      };
    },
    enabled: !!profile,
  });
}