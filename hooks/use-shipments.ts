"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type ShipmentStatus = "pending" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned";

export interface Shipment {
  id: string;
  shipment_number: string;
  order_id?: string;
  po_id?: string;
  user_id?: string;
  brand_id: string;
  distributor_id?: string;
  carrier?: string;
  tracking_number?: string;
  shipping_method?: string;
  shipping_cost?: number;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip_code?: string;
  shipping_country?: string;
  shipped_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  shipment_status: ShipmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface ShipmentFilters {
  status: string;
  dateRange: string;
  distributorId?: string;
}

interface UseShipmentsOptions {
  searchTerm: string;
  filters: ShipmentFilters;
  brandId?: string;
  debounceMs?: number;
}

interface UseShipmentsReturn {
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createShipment: (shipment: Partial<Shipment>) => Promise<Shipment>;
  updateShipment: (shipmentId: string, updates: Partial<Shipment>) => Promise<void>;
  deleteShipment: (shipmentId: string) => Promise<void>;
  totalCount: number;
}

async function fetchShipments(
  debouncedSearchTerm: string,
  filters: ShipmentFilters,
  brandId?: string
): Promise<{ shipments: Shipment[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("shipments").select("*", { count: "exact" });

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  if (filters.distributorId && filters.distributorId !== "all") {
    query = query.eq("distributor_id", filters.distributorId);
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

  return {
    shipments: data || [],
    totalCount: count || 0,
  };
}

export function useShipments({
  searchTerm,
  filters,
  brandId,
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
    queryKey: ["shipments", debouncedSearchTerm, filters, brandId],
    queryFn: () => fetchShipments(debouncedSearchTerm, filters, brandId),
    staleTime: 0,
  });

  const createShipmentMutation = useMutation({
    mutationFn: async (shipment: Partial<Shipment>): Promise<Shipment> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const shipmentData = {
        ...shipment,
        user_id: user?.id,
        shipment_number: `SHIP-${Date.now()}`,
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data: newShipment, error: createError } = await supabase
        .from("shipments")
        .insert(shipmentData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newShipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Shipment created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating shipment:", error);
      toast.error(error?.message || "Failed to create shipment. Please try again.");
    },
  });

  const updateShipmentMutation = useMutation({
    mutationFn: async ({
      shipmentId,
      updates,
    }: {
      shipmentId: string;
      updates: Partial<Shipment>;
    }): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

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
      toast.error(error?.message || "Failed to update shipment. Please try again.");
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
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Shipment deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting shipment:", error);
      toast.error(error?.message || "Failed to delete shipment. Please try again.");
    },
  });

  return {
    shipments: data?.shipments || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createShipment: async (shipment: Partial<Shipment>) => {
      return await createShipmentMutation.mutateAsync(shipment);
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

