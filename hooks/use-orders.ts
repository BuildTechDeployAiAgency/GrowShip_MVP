"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_paid";

export interface Order {
  id: string;
  order_number: string;
  order_date: string;
  user_id: string;
  brand_id: string;
  distributor_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_type?: "retail" | "wholesale" | "distributor" | "manufacturer";
  items: any[];
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  shipping_method?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  subtotal: number;
  discount_total?: number;
  tax_total?: number;
  shipping_cost?: number;
  total_amount: number;
  currency?: string;
  payment_method?: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface OrderFilters {
  status: string;
  paymentStatus: string;
  customerType: string;
  dateRange: string;
  distributorId?: string;
}

interface UseOrdersOptions {
  searchTerm: string;
  filters: OrderFilters;
  brandId?: string;
  debounceMs?: number;
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
}

async function fetchOrders(
  debouncedSearchTerm: string,
  filters: OrderFilters,
  brandId?: string
): Promise<{ orders: Order[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("orders").select("*", { count: "exact" });

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  if (filters.distributorId && filters.distributorId !== "all") {
    query = query.eq("distributor_id", filters.distributorId);
  }

  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `order_number.ilike.%${debouncedSearchTerm}%,customer_name.ilike.%${debouncedSearchTerm}%,customer_email.ilike.%${debouncedSearchTerm}%`
    );
  }

  if (filters.status !== "all") {
    query = query.eq("order_status", filters.status);
  }

  if (filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters.customerType !== "all") {
    query = query.eq("customer_type", filters.customerType);
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
    
    query = query.gte("order_date", startDate.toISOString());
  }

  query = query.order("order_date", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  return {
    orders: data || [],
    totalCount: count || 0,
  };
}

export function useOrders({
  searchTerm,
  filters,
  brandId,
  debounceMs = 300,
}: UseOrdersOptions): UseOrdersReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["orders", debouncedSearchTerm, filters, brandId],
    queryFn: () => fetchOrders(debouncedSearchTerm, filters, brandId),
    staleTime: 0,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (order: Partial<Order>): Promise<Order> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const orderData = {
        ...order,
        user_id: user?.id,
        order_number: `ORD-${Date.now()}`,
        order_date: new Date().toISOString(),
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newOrder;
    },
    onSuccess: () => {
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
    }): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("orders")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting order:", error);
      toast.error(error?.message || "Failed to delete order. Please try again.");
    },
  });

  return {
    orders: data?.orders || [],
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
    totalCount: data?.totalCount || 0,
    isRefetching,
  };
}

