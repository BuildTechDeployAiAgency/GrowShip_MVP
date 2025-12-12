"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import type { OperationalExpense, CreateExpenseRequest, UpdateExpenseRequest, FinancialFilters } from '@/types/financial';

const supabase = createClient();

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: FinancialFilters) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
};

export function useExpenses(filters?: FinancialFilters) {
  const { profile } = useEnhancedAuth();
  
  return useQuery({
    queryKey: expenseKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('operational_expenses')
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
            remaining_amount
          )
        `)
        .order('expense_date', { ascending: false });

      // Apply filters
      if (filters?.brandId || profile?.brand_id) {
        query = query.eq('brand_id', filters?.brandId || profile?.brand_id);
      }
      
      if (filters?.distributorId) {
        query = query.eq('distributor_id', filters.distributorId);
      }
      
      if (filters?.expenseTypes && filters.expenseTypes.length > 0) {
        query = query.in('expense_type', filters.expenseTypes);
      }
      
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      
      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        query = query.in('budget_category_id', filters.categoryIds);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('expense_date', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lte('expense_date', filters.dateTo);
      }
      
      if (filters?.amountMin) {
        query = query.gte('net_amount', filters.amountMin);
      }
      
      if (filters?.amountMax) {
        query = query.lte('net_amount', filters.amountMax);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OperationalExpense[];
    },
    enabled: !!profile,
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_expenses')
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
      return data as OperationalExpense;
    },
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { profile } = useEnhancedAuth();
  
  return useMutation({
    mutationFn: async (data: CreateExpenseRequest) => {
      // Generate expense number
      const expenseNumber = `EXP-${Date.now()}`;
      
      const expenseData = {
        ...data,
        expense_number: expenseNumber,
        brand_id: data.brandId || profile?.brand_id,
        status: 'pending_approval',
        approval_status: 'pending',
        net_amount: data.grossAmount + (data.taxAmount || 0),
        exchange_rate: 1,
        base_currency_amount: data.grossAmount + (data.taxAmount || 0),
        allocation_percentage: 100,
        is_allocatable: true,
        is_recurring: false,
        is_capital_expense: false,
        is_tax_deductible: true,
        submitted_by: profile?.user_id,
        submitted_at: new Date().toISOString(),
        created_by: profile?.user_id,
      };

      const { data: newExpense, error } = await supabase
        .from('operational_expenses')
        .insert([expenseData])
        .select()
        .single();

      if (error) throw error;
      return newExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { profile } = useEnhancedAuth();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateExpenseRequest) => {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // If status is being updated to approved
      if (data.approvalStatus === 'approved') {
        updateData.approved_by = profile?.user_id;
        updateData.approved_at = new Date().toISOString();
        updateData.status = 'approved';
      }

      const { data: updatedExpense, error } = await supabase
        .from('operational_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedExpense;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(data.id) });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('operational_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useExpenseMetrics(filters?: FinancialFilters) {
  const { profile } = useEnhancedAuth();
  
  return useQuery({
    queryKey: ['expense-metrics', filters],
    queryFn: async () => {
      let query = supabase
        .from('operational_expenses')
        .select('*');

      if (filters?.brandId || profile?.brand_id) {
        query = query.eq('brand_id', filters?.brandId || profile?.brand_id);
      }
      
      if (filters?.fiscalYear) {
        query = query.gte('expense_date', `${filters.fiscalYear}-01-01`);
        query = query.lte('expense_date', `${filters.fiscalYear}-12-31`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Calculate metrics
      const totalExpenses = data?.length || 0;
      const totalAmount = data?.reduce((sum, e) => sum + e.net_amount, 0) || 0;
      const pendingApprovalAmount = data
        ?.filter(e => e.status === 'pending_approval')
        .reduce((sum, e) => sum + e.net_amount, 0) || 0;
      const approvedAmount = data
        ?.filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + e.net_amount, 0) || 0;
      const paidAmount = data
        ?.filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + e.net_amount, 0) || 0;
      const overdueAmount = data
        ?.filter(e => e.status === 'overdue')
        .reduce((sum, e) => sum + e.net_amount, 0) || 0;

      return {
        totalExpenses,
        totalAmount,
        pendingApprovalAmount,
        approvedAmount,
        paidAmount,
        overdueAmount,
        averageExpenseAmount: totalExpenses > 0 ? totalAmount / totalExpenses : 0,
      };
    },
    enabled: !!profile,
  });
}