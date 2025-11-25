"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type ReportStatus = "draft" | "submitted" | "confirmed" | "archived";

export interface MonthlyDistributorReport {
  id: string;
  brand_id: string;
  distributor_id: string;
  purchase_order_id?: string;
  report_month: string;  // '2025-11-01'
  
  // Metrics
  total_orders: number;
  total_units: number;
  total_sales: number;
  fill_rate?: number;  // Percentage
  avg_order_value?: number;
  
  // Status
  status: ReportStatus;
  submitted_at?: string;
  submitted_by?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  
  // Metadata
  notes?: string;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

interface ReportFilters {
  status: string;
  month?: string;
  distributorId?: string;
  purchaseOrderId?: string;
}

interface UseMonthlyReportsOptions {
  brandId?: string;
  distributorId?: string;
  filters: ReportFilters;
  debounceMs?: number;
}

interface UseMonthlyReportsReturn {
  reports: MonthlyDistributorReport[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  generateReport: (params: {
    brandId: string;
    distributorId: string;
    month: string;
    purchaseOrderId?: string;
  }) => Promise<MonthlyDistributorReport>;
  updateReport: (
    reportId: string,
    updates: Partial<MonthlyDistributorReport>
  ) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  totalCount: number;
}

async function fetchReports(
  filters: ReportFilters,
  brandId?: string,
  distributorId?: string
): Promise<{ reports: MonthlyDistributorReport[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase
    .from("monthly_distributor_reports")
    .select("*", { count: "exact" });

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  if (distributorId) {
    query = query.eq("distributor_id", distributorId);
  }

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.month) {
    query = query.eq("report_month", filters.month);
  }

  if (filters.distributorId && filters.distributorId !== "all") {
    query = query.eq("distributor_id", filters.distributorId);
  }

  if (filters.purchaseOrderId) {
    query = query.eq("purchase_order_id", filters.purchaseOrderId);
  }

  query = query.order("report_month", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    console.error("[fetchReports] Error:", fetchError);
    throw fetchError;
  }

  return {
    reports: data || [],
    totalCount: count || 0,
  };
}

export function useMonthlyReports({
  brandId,
  distributorId,
  filters,
  debounceMs = 300,
}: UseMonthlyReportsOptions): UseMonthlyReportsReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["monthlyReports", filters, brandId, distributorId],
    queryFn: () => fetchReports(filters, brandId, distributorId),
    staleTime: 60000, // Cache for 1 minute
  });

  const generateReportMutation = useMutation({
    mutationFn: async (params: {
      brandId: string;
      distributorId: string;
      month: string;
      purchaseOrderId?: string;
    }): Promise<MonthlyDistributorReport> => {
      const response = await fetch("/api/reports/monthly/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate report");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthlyReports"] });
      toast.success("Report generated successfully!");
    },
    onError: (error: any) => {
      console.error("Error generating report:", error);
      toast.error(error?.message || "Failed to generate report");
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      updates,
    }: {
      reportId: string;
      updates: Partial<MonthlyDistributorReport>;
    }): Promise<void> => {
      const supabase = createClient();
      const { error } = await supabase
        .from("monthly_distributor_reports")
        .update(updates)
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthlyReports"] });
      toast.success("Report updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating report:", error);
      toast.error(error?.message || "Failed to update report");
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("monthly_distributor_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthlyReports"] });
      toast.success("Report deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting report:", error);
      toast.error(error?.message || "Failed to delete report");
    },
  });

  return {
    reports: data?.reports || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    generateReport: async (params) => {
      return await generateReportMutation.mutateAsync(params);
    },
    updateReport: async (reportId, updates) => {
      await updateReportMutation.mutateAsync({ reportId, updates });
    },
    deleteReport: async (reportId) => {
      await deleteReportMutation.mutateAsync(reportId);
    },
    totalCount: data?.totalCount || 0,
  };
}

