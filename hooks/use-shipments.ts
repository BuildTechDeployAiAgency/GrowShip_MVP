"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import type {
  Shipment,
  ShipmentItem,
  ShipmentFilters,
  ShipmentStatus,
  CreateShipmentInput,
  CreateShipmentResult,
  UpdateShipmentStatusResult,
} from "@/types/shipments";

// Re-export types for backward compatibility
export type { Shipment, ShipmentItem, ShipmentStatus, ShipmentFilters };

interface UseShipmentsOptions {
  searchTerm: string;
  filters: ShipmentFilters;
  brandId?: string;
  distributorId?: string;
  orderId?: string; // Filter by specific order
  debounceMs?: number;
}

interface UseShipmentsReturn {
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createShipment: (input: CreateShipmentInput) => Promise<CreateShipmentResult>;
  updateShipmentStatus: (
    shipmentId: string,
    newStatus: ShipmentStatus,
    notes?: string
  ) => Promise<UpdateShipmentStatusResult>;
  updateShipment: (shipmentId: string, updates: Partial<Shipment>) => Promise<void>;
  deleteShipment: (shipmentId: string) => Promise<void>;
  totalCount: number;
}

async function fetchShipments(
  debouncedSearchTerm: string,
  filters: ShipmentFilters,
  brandId?: string,
  distributorId?: string,
  orderId?: string
): Promise<{ shipments: Shipment[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase
    .from("shipments")
    .select(
      `
      *,
      shipment_items (
        id,
        order_line_id,
        product_id,
        sku,
        product_name,
        quantity_shipped,
        unit_price,
        cost_price,
        total_value
      ),
      orders!inner (
        order_number,
        customer_name
      )
    `,
      { count: "exact" }
    );

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  if (orderId) {
    query = query.eq("order_id", orderId);
  }

  // For distributor_admin users, always filter by their distributor_id
  const finalDistributorId =
    distributorId ||
    (filters.distributorId && filters.distributorId !== "all"
      ? filters.distributorId
      : undefined);

  if (finalDistributorId) {
    query = query.eq("distributor_id", finalDistributorId);
  }

  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `shipment_number.ilike.%${debouncedSearchTerm}%,tracking_number.ilike.%${debouncedSearchTerm}%,carrier.ilike.%${debouncedSearchTerm}%`
    );
  }

  if (filters.status !== "all") {
    query = query.eq("shipment_status", filters.status);
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

    query = query.gte("created_at", startDate.toISOString());
  }

  query = query.order("created_at", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  // Transform the data to match our interface
  const shipments: Shipment[] = (data || []).map((s: any) => ({
    ...s,
    order: s.orders
      ? {
          order_number: s.orders.order_number,
          customer_name: s.orders.customer_name,
        }
      : undefined,
  }));

  return {
    shipments,
    totalCount: count || 0,
  };
}

export function useShipments({
  searchTerm,
  filters,
  brandId,
  distributorId,
  orderId,
  debounceMs = 300,
}: UseShipmentsOptions): UseShipmentsReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "shipments",
      debouncedSearchTerm,
      filters,
      brandId,
      distributorId,
      orderId,
    ],
    queryFn: () =>
      fetchShipments(
        debouncedSearchTerm,
        filters,
        brandId,
        distributorId,
        orderId
      ),
    staleTime: 3 * 60 * 1000, // 3 minutes - shipment data updates moderately
    refetchOnWindowFocus: false,
  });

  // Create shipment using the atomic RPC function
  const createShipmentMutation = useMutation({
    mutationFn: async (input: CreateShipmentInput): Promise<CreateShipmentResult> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: rpcError } = await supabase.rpc(
        "create_shipment_transaction",
        {
          p_order_id: input.order_id,
          p_carrier: input.carrier || null,
          p_tracking_number: input.tracking_number || null,
          p_shipping_method: input.shipping_method || null,
          p_notes: input.notes || null,
          p_items: input.items,
          p_user_id: user?.id || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      // The RPC returns a JSONB object
      const result = data as CreateShipmentResult;

      if (!result.success) {
        throw new Error(result.error || "Failed to create shipment");
      }

      return result;
    },
    onSuccess: (result) => {
      // More targeted invalidation to prevent excessive refetching
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(
        `Shipment ${result.shipment_number} created successfully!`
      );
    },
    onError: (error: any) => {
      console.error("Error creating shipment:", error);
      toast.error(
        error?.message || "Failed to create shipment. Please try again."
      );
    },
  });

  // Update shipment status using the RPC function
  const updateShipmentStatusMutation = useMutation({
    mutationFn: async ({
      shipmentId,
      newStatus,
      notes,
    }: {
      shipmentId: string;
      newStatus: ShipmentStatus;
      notes?: string;
    }): Promise<UpdateShipmentStatusResult> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: rpcError } = await supabase.rpc(
        "update_shipment_status",
        {
          p_shipment_id: shipmentId,
          p_new_status: newStatus,
          p_user_id: user?.id || null,
          p_notes: notes || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const result = data as UpdateShipmentStatusResult;

      if (!result.success) {
        throw new Error(result.error || "Failed to update shipment status");
      }

      return result;
    },
    onSuccess: (result) => {
      // More targeted invalidation to prevent excessive refetching
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(`Shipment status updated to ${result.new_status}`);
    },
    onError: (error: any) => {
      console.error("Error updating shipment status:", error);
      toast.error(
        error?.message || "Failed to update shipment status. Please try again."
      );
    },
  });

  // Direct update mutation (for non-status fields like tracking number)
  const updateShipmentMutation = useMutation({
    mutationFn: async ({
      shipmentId,
      updates,
    }: {
      shipmentId: string;
      updates: Partial<Shipment>;
    }): Promise<void> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("shipments")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shipmentId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Shipment updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating shipment:", error);
      toast.error(
        error?.message || "Failed to update shipment. Please try again."
      );
    },
  });

  const deleteShipmentMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("shipments")
        .delete()
        .eq("id", shipmentId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // More targeted invalidation to prevent excessive refetching
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Shipment deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting shipment:", error);
      toast.error(
        error?.message || "Failed to delete shipment. Please try again."
      );
    },
  });

  return {
    shipments: data?.shipments || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createShipment: async (input: CreateShipmentInput) => {
      return await createShipmentMutation.mutateAsync(input);
    },
    updateShipmentStatus: async (
      shipmentId: string,
      newStatus: ShipmentStatus,
      notes?: string
    ) => {
      return await updateShipmentStatusMutation.mutateAsync({
        shipmentId,
        newStatus,
        notes,
      });
    },
    updateShipment: async (shipmentId: string, updates: Partial<Shipment>) => {
      await updateShipmentMutation.mutateAsync({ shipmentId, updates });
    },
    deleteShipment: async (shipmentId: string) => {
      await deleteShipmentMutation.mutateAsync(shipmentId);
    },
    totalCount: data?.totalCount || 0,
  };
}

/**
 * Hook to fetch shipments for a specific order
 */
export function useOrderShipments(orderId: string, brandId?: string) {
  return useShipments({
    searchTerm: "",
    filters: { status: "all", dateRange: "all" },
    brandId,
    orderId,
  });
}

/**
 * Hook to fetch a single shipment by ID
 */
export function useShipment(shipmentId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("shipments")
        .select(
          `
          *,
          shipment_items (
            id,
            order_line_id,
            product_id,
            sku,
            product_name,
            quantity_shipped,
            unit_price,
            cost_price,
            total_value
          ),
          orders (
            id,
            order_number,
            customer_name,
            customer_email,
            order_status,
            fulfilment_status
          ),
          distributors (
            id,
            name,
            code
          )
        `
        )
        .eq("id", shipmentId)
        .single();

      if (error) {
        throw error;
      }

      return data as Shipment & {
        orders: any;
        distributors: any;
      };
    },
    enabled: !!shipmentId,
  });

  return {
    shipment: data || null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
