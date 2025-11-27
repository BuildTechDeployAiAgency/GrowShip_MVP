"use client";

import { useState, useEffect } from "react";
import { POActionsMenu } from "@/components/purchase-orders/po-actions-menu";
import type { PurchaseOrder } from "@/types/purchase-orders";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PONotificationActionsProps {
  poId: string;
  onStatusChange?: () => void;
}

export function PONotificationActions({
  poId,
  onStatusChange,
}: PONotificationActionsProps) {
  const router = useRouter();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
      if (!poId) return;

      try {
        setLoading(true);
        const supabase = createClient();

        const { data: poData, error: poError } = await supabase
          .from("purchase_orders")
          .select("*")
          .eq("id", poId)
          .single();

        if (poError) {
          console.error("Error fetching PO:", poError);
          return;
        }

        // Transform the data to match PurchaseOrder type
        const purchaseOrder: PurchaseOrder = {
          ...poData,
          items: poData.items || [],
          purchase_order_lines: poData.purchase_order_lines || [],
        };

        setPO(purchaseOrder);
      } catch (error) {
        console.error("Error fetching PO:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [poId]);

  const handleStatusChange = () => {
    // Refetch PO data and notify parent to refresh notifications
    const refetchPO = async () => {
      const supabase = createClient();
      const { data: poData, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (!error && poData) {
        const purchaseOrder: PurchaseOrder = {
          ...poData,
          items: poData.items || [],
          purchase_order_lines: poData.purchase_order_lines || [],
        };
        setPO(purchaseOrder);
      }
    };

    refetchPO();
    onStatusChange?.();
  };

  const handleViewDetails = (id: string) => {
    router.push(`/purchase-orders/${id}`);
  };

  if (loading || !po) {
    return null;
  }

  return (
    <POActionsMenu
      po={po}
      onStatusChange={handleStatusChange}
      onViewDetails={handleViewDetails}
    />
  );
}

