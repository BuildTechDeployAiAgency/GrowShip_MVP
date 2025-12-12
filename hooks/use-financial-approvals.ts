"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useEnhancedAuth } from '@/contexts/enhanced-auth-context';
import type { ExpenseApproval, ApprovalStatus } from '@/types/financial';

const supabase = createClient();

export const approvalKeys = {
  all: ['financial-approvals'] as const,
  pending: () => [...approvalKeys.all, 'pending'] as const,
  byUser: (userId: string) => [...approvalKeys.all, 'user', userId] as const,
  detail: (id: string) => [...approvalKeys.all, 'detail', id] as const,
};

interface ApprovalNotification {
  id: string;
  type: 'budget_approval' | 'expense_approval';
  entityId: string;
  entityName: string;
  amount: number;
  currency: string;
  requestedBy: string;
  requestedAt: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  status: ApprovalStatus;
  notes?: string;
  department?: string;
  budgetRemaining?: number;
}

export function usePendingApprovals() {
  const { profile } = useEnhancedAuth();
  
  return useQuery({
    queryKey: approvalKeys.pending(),
    queryFn: async () => {
      // Get pending expense approvals
      const { data: expenseApprovals, error: expenseError } = await supabase
        .from('expense_approvals')
        .select(`
          *,
          operational_expenses!inner (
            id,
            expense_number,
            description,
            net_amount,
            currency,
            expense_type,
            department,
            submitted_by,
            created_at,
            budget_categories (
              name
            )
          )
        `)
        .eq('approval_status', 'pending')
        .eq('approver_user_id', profile?.user_id);

      if (expenseError) throw expenseError;

      // Get pending budget approvals
      const { data: budgetApprovals, error: budgetError } = await supabase
        .from('financial_budgets')
        .select(`
          id,
          budget_name,
          planned_amount,
          currency,
          department,
          created_by,
          created_at,
          budget_categories (
            name
          )
        `)
        .eq('approval_status', 'pending')
        .eq('status', 'pending_approval');

      if (budgetError) throw budgetError;

      // Transform to unified notification format
      const notifications: ApprovalNotification[] = [];

      // Add expense approvals
      expenseApprovals?.forEach((approval) => {
        const expense = approval.operational_expenses;
        notifications.push({
          id: approval.id,
          type: 'expense_approval',
          entityId: expense.id,
          entityName: expense.description,
          amount: expense.net_amount,
          currency: expense.currency || '$',
          requestedBy: expense.submitted_by || 'Unknown',
          requestedAt: expense.created_at,
          category: expense.budget_categories?.name || expense.expense_type,
          urgency: expense.net_amount > 10000 ? 'high' : expense.net_amount > 5000 ? 'medium' : 'low',
          status: approval.approval_status,
          notes: expense.notes,
          department: expense.department,
        });
      });

      // Add budget approvals
      budgetApprovals?.forEach((budget) => {
        notifications.push({
          id: budget.id,
          type: 'budget_approval',
          entityId: budget.id,
          entityName: budget.budget_name,
          amount: budget.planned_amount,
          currency: budget.currency || '$',
          requestedBy: budget.created_by || 'Unknown',
          requestedAt: budget.created_at,
          category: budget.budget_categories?.name || 'Uncategorized',
          urgency: budget.planned_amount > 100000 ? 'high' : budget.planned_amount > 50000 ? 'medium' : 'low',
          status: 'pending',
          department: budget.department,
        });
      });

      // Sort by urgency and date
      notifications.sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        
        return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
      });

      return notifications;
    },
    enabled: !!profile,
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();
  const { profile } = useEnhancedAuth();
  
  return useMutation({
    mutationFn: async ({ 
      approvalId, 
      comments 
    }: { 
      approvalId: string; 
      comments?: string; 
    }) => {
      const updateData = {
        approval_status: 'approved',
        approved_amount: 0, // Will be set from expense amount
        approval_date: new Date().toISOString(),
        approval_comments: comments,
        completed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('expense_approvals')
        .update(updateData)
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;

      // Update expense status
      if (data.expense_id) {
        await supabase
          .from('operational_expenses')
          .update({
            status: 'approved',
            approval_status: 'approved',
            approved_by: profile?.user_id,
            approved_at: new Date().toISOString(),
            approval_comments: comments,
          })
          .eq('id', data.expense_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useRejectExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      approvalId, 
      reason 
    }: { 
      approvalId: string; 
      reason: string; 
    }) => {
      const updateData = {
        approval_status: 'rejected',
        approval_date: new Date().toISOString(),
        rejection_reason: reason,
        completed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('expense_approvals')
        .update(updateData)
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;

      // Update expense status
      if (data.expense_id) {
        await supabase
          .from('operational_expenses')
          .update({
            status: 'rejected',
            approval_status: 'rejected',
            approval_comments: reason,
          })
          .eq('id', data.expense_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useApproveBudget() {
  const queryClient = useQueryClient();
  const { profile } = useEnhancedAuth();
  
  return useMutation({
    mutationFn: async ({ 
      budgetId, 
      comments 
    }: { 
      budgetId: string; 
      comments?: string; 
    }) => {
      const updateData = {
        status: 'active',
        approval_status: 'approved',
        approved_by: profile?.user_id,
        approved_at: new Date().toISOString(),
        approval_comments: comments,
      };

      const { data, error } = await supabase
        .from('financial_budgets')
        .update(updateData)
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useRejectBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      budgetId, 
      reason 
    }: { 
      budgetId: string; 
      reason: string; 
    }) => {
      const updateData = {
        status: 'rejected',
        approval_status: 'rejected',
        approval_comments: reason,
      };

      const { data, error } = await supabase
        .from('financial_budgets')
        .update(updateData)
        .eq('id', budgetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

// Import keys from other hooks
import { expenseKeys } from './use-expenses';
import { budgetKeys } from './use-budgets';