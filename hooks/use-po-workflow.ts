import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface POApprovalHistory {
  id: string;
  po_id: string;
  action: "submitted" | "approved" | "rejected" | "cancelled";
  actor_id: string;
  comments?: string;
  created_at: string;
  actor?: {
    user_id: string;
    full_name?: string;
    email?: string;
  };
}

export function usePOApprovalHistory(poId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["po-approval-history", poId],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders/${poId}/history`);
      if (!response.ok) throw new Error("Failed to fetch PO approval history");
      return response.json();
    },
    enabled: !!poId,
  });

  return {
    history: (data?.history || []) as POApprovalHistory[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function usePOApproval() {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async ({ poId, comments }: { poId: string; comments?: string }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve PO");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["po-approval-history"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      poId,
      rejection_reason,
      comments,
    }: {
      poId: string;
      rejection_reason: string;
      comments?: string;
    }) => {
      const response = await fetch(`/api/purchase-orders/${poId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason, comments }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject PO");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["po-approval-history"] });
    },
  });

  return {
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}


