"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { usePaginatedResource } from "./use-paginated-resource";
import type { PurchaseOrder, PurchaseOrderFilters } from "@/types/purchase-orders";
import { updatePaginatedCaches } from "@/lib/react-query/paginated-cache";
import { postJson } from "@/lib/api/json-client";

interface UsePurchaseOrdersOptions {
  searchTerm: string;
  filters: PurchaseOrderFilters;
  brandId?: string;
  distributorId?: string;
  debounceMs?: number;
  pageSize?: number;
}

interface UsePurchaseOrdersReturn {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createPurchaseOrder: (po: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (
    poId: string,
    updates: Partial<PurchaseOrder>
  ) => Promise<void>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

interface PurchaseOrdersRequestPayload {
  page: number;
  pageSize: number;
  filters: PurchaseOrderFilters;
  searchTerm?: string;
  brandId?: string;
  distributorId?: string;
}

async function requestPurchaseOrdersPage(
  payload: PurchaseOrdersRequestPayload
): Promise<{ data: PurchaseOrder[]; totalCount: number }> {
  const json = await postJson<
    PurchaseOrdersRequestPayload,
    { data: PurchaseOrder[]; totalCount: number }
  >("/api/purchase-orders/list", payload);
  return {
    data: json.data ?? [],
    totalCount: json.totalCount ?? 0,
  };
}

function purchaseOrderMatchesFilters(
  po: PurchaseOrder,
  filters: PurchaseOrderFilters | null,
  searchTerm: string
) {
  if (searchTerm) {
    return false;
  }

  if (!filters) {
    return true;
  }

  if (filters.status && filters.status !== "all" && po.po_status !== filters.status) {
    return false;
  }

  if (
    filters.paymentStatus &&
    filters.paymentStatus !== "all" &&
    po.payment_status !== filters.paymentStatus
  ) {
    return false;
  }

  if (
    filters.distributorId &&
    filters.distributorId !== "all" &&
    po.distributor_id !== filters.distributorId
  ) {
    return false;
  }

  if (filters.dateRange && filters.dateRange !== "all") {
    return false;
  }

  return true;
}

function prependPurchaseOrder(
  queryClient: ReturnType<typeof useQueryClient>,
  po: PurchaseOrder
) {
  updatePaginatedCaches<PurchaseOrder, PurchaseOrderFilters>(
    queryClient,
    "purchaseOrders",
    (cache, meta) => {
      if (
        meta.page !== 0 ||
        !purchaseOrderMatchesFilters(po, meta.filters, meta.searchTerm)
      ) {
        return null;
      }

      const deduped = cache.data.filter((existing) => existing.id !== po.id);

      return {
        data: [po, ...deduped].slice(0, meta.pageSize),
        totalCount: (cache.totalCount ?? 0) + 1,
      };
    }
  );
}

function updatePurchaseOrderInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  po: PurchaseOrder
) {
  updatePaginatedCaches<PurchaseOrder, PurchaseOrderFilters>(
    queryClient,
    "purchaseOrders",
    (cache) => {
      if (!cache.data.some((existing) => existing.id === po.id)) {
        return null;
      }

      return {
        data: cache.data.map((existing) =>
          existing.id === po.id ? { ...existing, ...po } : existing
        ),
        totalCount: cache.totalCount,
      };
    }
  );
}

function removePurchaseOrderFromCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  poId: string
) {
  updatePaginatedCaches<PurchaseOrder, PurchaseOrderFilters>(
    queryClient,
    "purchaseOrders",
    (cache) => {
      if (!cache.data.some((existing) => existing.id === poId)) {
        return null;
  }

  return {
        data: cache.data.filter((existing) => existing.id !== poId),
        totalCount: Math.max(0, (cache.totalCount ?? 0) - 1),
  };
    }
  );
}

export function usePurchaseOrders({
  searchTerm,
  filters,
  brandId,
  distributorId,
  debounceMs = 300,
  pageSize = 25,
}: UsePurchaseOrdersOptions): UsePurchaseOrdersReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const resolvedDistributorId =
    distributorId ||
    (filters.distributorId && filters.distributorId !== "all"
      ? filters.distributorId
      : undefined);

  const normalizedFilters: PurchaseOrderFilters =
    resolvedDistributorId && filters.distributorId !== resolvedDistributorId
      ? { ...filters, distributorId: resolvedDistributorId }
      : filters;

  const paginated = usePaginatedResource({
    queryKey: "purchaseOrders",
    filters: normalizedFilters,
    searchTerm: debouncedSearchTerm,
    initialPageSize: pageSize,
    identityKey: [brandId ?? "brand:none", resolvedDistributorId ?? "distributor:all"],
    fetcher: ({ page, pageSize: size, filters: currentFilters, searchTerm }) =>
      requestPurchaseOrdersPage({
        page,
        pageSize: size,
        filters: currentFilters,
        searchTerm,
        brandId,
        distributorId: resolvedDistributorId,
      }),
  });

  useEffect(() => {
    paginated.setPage(0);
  }, [brandId, resolvedDistributorId, paginated.setPage]);

  const { isLoading, error, refetch } = paginated.query;

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

      // Trigger notification creation via API
      if (newPO && user?.id && newPO.brand_id) {
        try {
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "order",
              title: "New Purchase Order Created",
              message: `Purchase Order ${newPO.po_number} has been created and requires review`,
              brand_id: newPO.brand_id,
              related_entity_type: "po",
              related_entity_id: newPO.id,
              priority: "medium",
              action_required: true,
              action_url: `/purchase-orders/${newPO.id}`,
            }),
          });
        } catch (notifError) {
          console.error("Error creating PO notification:", notifError);
          // Don't fail the PO creation if notification fails
        }
      }

      return newPO;
    },
    onSuccess: (newPO) => {
      prependPurchaseOrder(queryClient, newPO);
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
    }): Promise<PurchaseOrder> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: updatedPO, error } = await supabase
        .from("purchase_orders")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", poId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updatedPO;
    },
    onSuccess: (updatedPO) => {
      if (updatedPO) {
        updatePurchaseOrderInCaches(queryClient, updatedPO);
      }
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
    onSuccess: (_data, poId) => {
      removePurchaseOrderFromCaches(queryClient, poId);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase order deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting purchase order:", error);
      toast.error(error?.message || "Failed to delete purchase order. Please try again.");
    },
  });

  return {
    purchaseOrders: paginated.data,
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
    totalCount: paginated.totalCount,
    page: paginated.page,
    pageSize: paginated.pageSize,
    pageCount: paginated.pageCount,
    setPage: paginated.setPage,
    setPageSize: paginated.setPageSize,
  };
}

