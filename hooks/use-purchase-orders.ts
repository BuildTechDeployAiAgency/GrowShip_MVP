"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type POStatus = "draft" | "submitted" | "approved" | "rejected" | "ordered" | "received" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_paid";

export interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  user_id?: string;
  brand_id: string;
  distributor_id?: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  items: any[];
  subtotal?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount?: number;
  currency?: string;
  po_status: POStatus;
  payment_status: PaymentStatus;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface POFilters {
  status: string;
  paymentStatus: string;
  dateRange: string;
  distributorId?: string;
}

interface UsePurchaseOrdersOptions {
  searchTerm: string;
  filters: POFilters;
  brandId?: string;
  distributorId?: string; // For distributor_admin users, auto-filter by their distributor_id
  debounceMs?: number;
}

interface UsePurchaseOrdersReturn {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createPurchaseOrder: (po: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (poId: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  totalCount: number;
}

async function fetchPurchaseOrders(
  debouncedSearchTerm: string,
  filters: POFilters,
  brandId?: string,
  distributorId?: string
): Promise<{ purchaseOrders: PurchaseOrder[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("purchase_orders").select("*", { count: "exact" });

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  // For distributor_admin users, always filter by their distributor_id
  const finalDistributorId = distributorId || (filters.distributorId && filters.distributorId !== "all" ? filters.distributorId : undefined);
  
  if (finalDistributorId) {
    query = query.eq("distributor_id", finalDistributorId);
  }

  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `po_number.ilike.%${debouncedSearchTerm}%,supplier_name.ilike.%${debouncedSearchTerm}%,supplier_email.ilike.%${debouncedSearchTerm}%`
    );
  }

  if (filters.status !== "all") {
    query = query.eq("po_status", filters.status);
  }

  if (filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters.dateRange !== "all") {
    const now = new Date();
    let startDate: Date;
    
    switch (filters.dateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(0);
    }
    
    query = query.gte("po_date", startDate.toISOString());
  }

  query = query.order("po_date", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  return {
    purchaseOrders: data || [],
    totalCount: count || 0,
  };
}

export function usePurchaseOrders({
  searchTerm,
  filters,
  brandId,
  distributorId,
  debounceMs = 300,
}: UsePurchaseOrdersOptions): UsePurchaseOrdersReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["purchaseOrders", debouncedSearchTerm, filters, brandId, distributorId],
    queryFn: () => fetchPurchaseOrders(debouncedSearchTerm, filters, brandId, distributorId),
    staleTime: 0,
  });

  const createPOMutation = useMutation({
    mutationFn: async (po: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const poData = {
        ...po,
        user_id: user?.id,
        po_number: `PO-${Date.now()}`,
        po_date: new Date().toISOString(),
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data: newPO, error: createError } = await supabase
        .from("purchase_orders")
        .insert(poData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newPO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase order created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating purchase order:", error);
      toast.error(error?.message || "Failed to create purchase order. Please try again.");
    },
  });

  const updatePOMutation = useMutation({
    mutationFn: async ({
      poId,
      updates,
    }: {
      poId: string;
      updates: Partial<PurchaseOrder>;
    }): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("purchase_orders")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", poId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase order updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating purchase order:", error);
      toast.error(error?.message || "Failed to update purchase order. Please try again.");
    },
  });

  const deletePOMutation = useMutation({
    mutationFn: async (poId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", poId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase order deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting purchase order:", error);
      toast.error(error?.message || "Failed to delete purchase order. Please try again.");
    },
  });

  return {
    purchaseOrders: data?.purchaseOrders || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createPurchaseOrder: async (po: Partial<PurchaseOrder>) => {
      return await createPOMutation.mutateAsync(po);
    },
    updatePurchaseOrder: async (poId: string, updates: Partial<PurchaseOrder>) => {
      await updatePOMutation.mutateAsync({ poId, updates });
    },
    deletePurchaseOrder: async (poId: string) => {
      await deletePOMutation.mutateAsync(poId);
    },
    totalCount: data?.totalCount || 0,
  };
}

