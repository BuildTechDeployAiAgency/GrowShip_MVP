"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { usePaginatedResource } from "./use-paginated-resource";
import type { Order, OrderFilters } from "@/types/orders";
import { updatePaginatedCaches } from "@/lib/react-query/paginated-cache";
import { postJson } from "@/lib/api/json-client";

interface UseOrdersOptions {
  searchTerm: string;
  filters: OrderFilters;
  brandId?: string;
  distributorId?: string;
  debounceMs?: number;
  pageSize?: number;
}

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createOrder: (order: Partial<Order>) => Promise<Order>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  totalCount: number;
  isRefetching: boolean;
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

type OrdersListPayload = {
  page: number;
  pageSize: number;
  filters: OrderFilters;
  searchTerm?: string;
  brandId?: string;
  distributorId?: string;
};

async function requestOrdersPage(
  payload: OrdersListPayload
): Promise<{ data: Order[]; totalCount: number }> {
  const json = await postJson<OrdersListPayload, { data: Order[]; totalCount: number }>(
    "/api/orders/list",
    payload
  );
  return {
    data: json.data ?? [],
    totalCount: json.totalCount ?? 0,
  };
}

function buildFiltersPayload(filters: OrderFilters, distributorId?: string) {
  if (
    distributorId &&
    distributorId !== "all" &&
    filters.distributorId !== distributorId
  ) {
    return {
      ...filters,
      distributorId,
    };
  }

  return filters;
}

function orderMatchesFilters(
  order: Order,
  filters: OrderFilters | null,
  searchTerm: string
) {
  if (searchTerm) {
    return false;
  }

  if (!filters) {
    return true;
  }

  if (filters.status && filters.status !== "all" && order.order_status !== filters.status) {
    return false;
  }

  if (
    filters.paymentStatus &&
    filters.paymentStatus !== "all" &&
    order.payment_status !== filters.paymentStatus
  ) {
    return false;
  }

  if (
    filters.customerType &&
    filters.customerType !== "all" &&
    order.customer_type !== filters.customerType
  ) {
    return false;
  }

  if (
    filters.distributorId &&
    filters.distributorId !== "all" &&
    order.distributor_id !== filters.distributorId
  ) {
    return false;
  }

  if (filters.dateRange && filters.dateRange !== "all") {
    return false;
  }

  return true;
}

function prependOrderToCaches(queryClient: ReturnType<typeof useQueryClient>, order: Order) {
  updatePaginatedCaches<Order, OrderFilters>(
    queryClient,
    "orders",
    (cache, meta) => {
      if (meta.page !== 0 || !orderMatchesFilters(order, meta.filters, meta.searchTerm)) {
        return null;
      }

      const deduped = cache.data.filter((existing) => existing.id !== order.id);

      return {
        data: [order, ...deduped].slice(0, meta.pageSize),
        totalCount: (cache.totalCount ?? 0) + 1,
      };
    }
  );
}

function updateOrderInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  order: Order
) {
  updatePaginatedCaches<Order, OrderFilters>(
    queryClient,
    "orders",
    (cache) => {
      if (!cache.data.some((existing) => existing.id === order.id)) {
        return null;
      }

      return {
        data: cache.data.map((existing) =>
          existing.id === order.id ? { ...existing, ...order } : existing
        ),
        totalCount: cache.totalCount,
      };
    }
  );
}

function removeOrderFromCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string
) {
  updatePaginatedCaches<Order, OrderFilters>(
    queryClient,
    "orders",
    (cache) => {
      if (!cache.data.some((existing) => existing.id === orderId)) {
        return null;
  }

  return {
        data: cache.data.filter((existing) => existing.id !== orderId),
        totalCount: Math.max(0, (cache.totalCount ?? 0) - 1),
  };
    }
  );
}

export function useOrders({
  searchTerm,
  filters,
  brandId,
  distributorId,
  debounceMs = 300,
  pageSize = 25,
}: UseOrdersOptions): UseOrdersReturn {
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

  const paginated = usePaginatedResource({
    queryKey: "orders",
    filters: buildFiltersPayload(filters, resolvedDistributorId),
    searchTerm: debouncedSearchTerm,
    initialPageSize: pageSize,
    identityKey: [brandId ?? "brand:none", resolvedDistributorId ?? "distributor:all"],
    fetcher: ({ page, pageSize: size, filters: currentFilters, searchTerm }) => {
      return requestOrdersPage({
        page,
        pageSize: size,
        filters: currentFilters,
        searchTerm,
        brandId,
        distributorId: resolvedDistributorId,
      });
    },
  });

  useEffect(() => {
    paginated.setPage(0);
  }, [brandId, resolvedDistributorId, paginated.setPage]);

  const { isLoading, error, refetch, isRefetching } = paginated.query;

  const createOrderMutation = useMutation({
    mutationFn: async (order: Partial<Order>): Promise<Order> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Validate required fields
      if (!order.brand_id) {
        throw new Error("Brand ID is required to create an order");
      }

      if (!order.distributor_id) {
        throw new Error("Distributor ID is required to create an order");
      }

      // Convert empty strings to null for optional UUID fields only
      const cleanOrderData = {
        ...order,
        customer_id: order.customer_id || null,
        // Keep brand_id and distributor_id as-is since they're required
      };

      const orderData = {
        ...cleanOrderData,
        user_id: user?.id,
        order_number: `ORD-${Date.now()}`,
        // Keep the order_date from the form if provided, otherwise use current date
        order_date: order.order_date || new Date().toISOString(),
        created_by: user?.id,
        updated_by: user?.id,
      };

      console.log("Creating order with data:", orderData);

      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (createError) {
        console.error("Supabase error creating order:", createError);
        throw new Error(createError.message || "Failed to create order");
      }

      return newOrder;
    },
    onSuccess: (newOrder) => {
      prependOrderToCaches(queryClient, newOrder);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating order:", error);
      toast.error(error?.message || "Failed to create order. Please try again.");
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: Partial<Order>;
    }): Promise<Order> => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update order");
      }

      return await response.json();
    },
    onSuccess: (updatedOrder) => {
      if (updatedOrder) {
        updateOrderInCaches(queryClient, updatedOrder);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating order:", error);
      toast.error(error?.message || "Failed to update order. Please try again.");
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, orderId) => {
      removeOrderFromCaches(queryClient, orderId);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting order:", error);
      toast.error(error?.message || "Failed to delete order. Please try again.");
    },
  });

  return {
    orders: paginated.data,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createOrder: async (order: Partial<Order>) => {
      return await createOrderMutation.mutateAsync(order);
    },
    updateOrder: async (orderId: string, updates: Partial<Order>) => {
      await updateOrderMutation.mutateAsync({ orderId, updates });
    },
    deleteOrder: async (orderId: string) => {
      await deleteOrderMutation.mutateAsync(orderId);
    },
    totalCount: paginated.totalCount,
    isRefetching,
    page: paginated.page,
    pageSize: paginated.pageSize,
    pageCount: paginated.pageCount,
    setPage: paginated.setPage,
    setPageSize: paginated.setPageSize,
  };
}

