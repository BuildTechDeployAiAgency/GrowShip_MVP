"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  CustomerFinancialMetrics,
  CustomerFinancialRequest,
  ReceivablesAgingRequest,
  DSOCalculationRequest,
} from "@/types/customer-financials";

interface UseCustomerFinancialsReturn {
  financialMetrics: CustomerFinancialMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseReceivablesAgingReturn {
  receivablesData: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCustomerFinancials(customerId: string): UseCustomerFinancialsReturn {
  const { data: financialMetrics, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-financials", customerId],
    queryFn: async (): Promise<CustomerFinancialMetrics> => {
      const response = await fetch(`/api/customers/${customerId}/financials`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch customer financial metrics");
      }
      return response.json();
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes - financial data changes moderately
    refetchOnWindowFocus: false,
  });

  return {
    financialMetrics: financialMetrics || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useReceivablesAging(
  customerId: string,
  filters?: {
    agingBucket?: string;
    minimumAmount?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
  }
): UseReceivablesAgingReturn {
  const queryParams = new URLSearchParams();
  
  if (filters?.agingBucket) queryParams.set("agingBucket", filters.agingBucket);
  if (filters?.minimumAmount) queryParams.set("minimumAmount", filters.minimumAmount.toString());
  if (filters?.sortBy) queryParams.set("sortBy", filters.sortBy);
  if (filters?.sortDirection) queryParams.set("sortDirection", filters.sortDirection);

  const { data: receivablesData, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-receivables", customerId, filters],
    queryFn: async () => {
      const url = `/api/customers/${customerId}/receivables?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch receivables aging data");
      }
      return response.json();
    },
    enabled: !!customerId,
    staleTime: 60 * 1000, // 1 minute - aging data changes frequently
    refetchOnWindowFocus: false,
  });

  return {
    receivablesData: receivablesData || null,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useCustomerPaymentHistory(customerId: string) {
  const { data: paymentHistory, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-payment-history", customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/payment-history`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch payment history");
      }
      return response.json();
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    paymentHistory: paymentHistory || [],
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useCustomerOrders(customerId: string) {
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/orders`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch customer orders");
      }
      return response.json();
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    orders: orders || [],
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useCustomerInvoices(customerId: string) {
  const { data: invoices, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/invoices`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch customer invoices");
      }
      return response.json();
    },
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    invoices: invoices || [],
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

// Hook for calculating financial metrics on-demand
export function useCalculateCustomerDSO() {
  const queryClient = useQueryClient();

  const calculateDSOMutation = useMutation({
    mutationFn: async ({ 
      customerId, 
      periodDays = 90, 
      calculationMethod = "standard" 
    }: DSOCalculationRequest & { customerId: string }) => {
      const response = await fetch(`/api/customers/${customerId}/dso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays, calculationMethod }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate DSO");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate financial metrics to refresh DSO data
      queryClient.invalidateQueries({ 
        queryKey: ["customer-financials", variables.customerId] 
      });
      toast.success("DSO calculated successfully");
    },
    onError: (error: any) => {
      console.error("Error calculating DSO:", error);
      toast.error(error.message || "Failed to calculate DSO");
    },
  });

  return {
    calculateDSO: calculateDSOMutation.mutateAsync,
    isCalculating: calculateDSOMutation.isPending,
  };
}

// Hook for refreshing all customer financial data
export function useRefreshCustomerFinancials() {
  const queryClient = useQueryClient();

  const refreshMutation = useMutation({
    mutationFn: async (customerId: string) => {
      // Trigger recalculation on the backend
      const response = await fetch(`/api/customers/${customerId}/financials/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to refresh financial data");
      }

      return response.json();
    },
    onSuccess: (data, customerId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: ["customer-financials", customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["customer-receivables", customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["customer-payment-history", customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["customer-orders", customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["customer-invoices", customerId] 
      });
      
      toast.success("Financial data refreshed successfully");
    },
    onError: (error: any) => {
      console.error("Error refreshing financial data:", error);
      toast.error(error.message || "Failed to refresh financial data");
    },
  });

  return {
    refreshFinancials: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
  };
}

// Utility hook for formatting financial metrics
export function useFinancialFormatting() {
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  const formatDays = (days: number) => {
    if (days === 0) return "0 days";
    if (days === 1) return "1 day";
    return `${Math.round(days)} days`;
  };

  const getRiskLevel = (riskScore: number): "low" | "medium" | "high" => {
    if (riskScore <= 3) return "low";
    if (riskScore <= 6) return "medium";
    return "high";
  };

  const getRiskColor = (riskLevel: "low" | "medium" | "high") => {
    switch (riskLevel) {
      case "low": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "high": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getAgingColor = (daysOverdue: number) => {
    if (daysOverdue <= 0) return "text-green-600";
    if (daysOverdue <= 30) return "text-yellow-600";
    if (daysOverdue <= 60) return "text-orange-600";
    return "text-red-600";
  };

  return {
    formatCurrency,
    formatPercentage,
    formatDays,
    getRiskLevel,
    getRiskColor,
    getAgingColor,
  };
}