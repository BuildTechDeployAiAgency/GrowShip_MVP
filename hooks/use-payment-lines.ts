"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import {
  PaymentLine,
  PaymentAttachment,
  CreatePaymentLineRequest,
  UpdatePaymentLineRequest,
  AttachmentDownload,
} from "@/types/payment-lines";

interface UsePaymentLinesReturn {
  paymentLines: PaymentLine[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createPaymentLine: (invoiceId: string, data: CreatePaymentLineRequest) => Promise<PaymentLine>;
  updatePaymentLine: (invoiceId: string, paymentId: string, updates: UpdatePaymentLineRequest) => Promise<void>;
  deletePaymentLine: (invoiceId: string, paymentId: string) => Promise<void>;
  verifyPaymentLine: (invoiceId: string, paymentId: string) => Promise<void>;
  rejectPaymentLine: (invoiceId: string, paymentId: string) => Promise<void>;
}

interface UsePaymentAttachmentsReturn {
  attachments: PaymentAttachment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  uploadAttachment: (invoiceId: string, paymentId: string, file: File) => Promise<PaymentAttachment>;
  downloadAttachment: (invoiceId: string, paymentId: string, attachmentId: string) => Promise<AttachmentDownload>;
  deleteAttachment: (invoiceId: string, paymentId: string, attachmentId: string) => Promise<void>;
}

export function usePaymentLines(invoiceId: string): UsePaymentLinesReturn {
  const queryClient = useQueryClient();

  const { data: paymentLines = [], isLoading, error, refetch } = useQuery({
    queryKey: ["payment-lines", invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments`);
      if (!response.ok) {
        throw new Error("Failed to fetch payment lines");
      }
      return response.json();
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds - payment data changes more frequently
    refetchOnWindowFocus: false,
  });

  const createPaymentLineMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string; data: CreatePaymentLineRequest }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment line");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment line created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating payment line:", error);
      toast.error(error.message || "Failed to create payment line");
    },
  });

  const updatePaymentLineMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      paymentId, 
      updates 
    }: { 
      invoiceId: string; 
      paymentId: string; 
      updates: UpdatePaymentLineRequest;
    }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update payment line");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment line updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating payment line:", error);
      toast.error(error.message || "Failed to update payment line");
    },
  });

  const deletePaymentLineMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentId }: { invoiceId: string; paymentId: string }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete payment line");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment line deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting payment line:", error);
      toast.error(error.message || "Failed to delete payment line");
    },
  });

  const verifyPaymentLineMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentId }: { invoiceId: string; paymentId: string }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "verified" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify payment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment verified successfully!");
    },
    onError: (error: any) => {
      console.error("Error verifying payment:", error);
      toast.error(error.message || "Failed to verify payment");
    },
  });

  const rejectPaymentLineMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentId }: { invoiceId: string; paymentId: string }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject payment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-lines", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment rejected successfully!");
    },
    onError: (error: any) => {
      console.error("Error rejecting payment:", error);
      toast.error(error.message || "Failed to reject payment");
    },
  });

  return {
    paymentLines,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    createPaymentLine: (invoiceId: string, data: CreatePaymentLineRequest) => 
      createPaymentLineMutation.mutateAsync({ invoiceId, data }),
    updatePaymentLine: (invoiceId: string, paymentId: string, updates: UpdatePaymentLineRequest) =>
      updatePaymentLineMutation.mutateAsync({ invoiceId, paymentId, updates }),
    deletePaymentLine: (invoiceId: string, paymentId: string) =>
      deletePaymentLineMutation.mutateAsync({ invoiceId, paymentId }),
    verifyPaymentLine: (invoiceId: string, paymentId: string) =>
      verifyPaymentLineMutation.mutateAsync({ invoiceId, paymentId }),
    rejectPaymentLine: (invoiceId: string, paymentId: string) =>
      rejectPaymentLineMutation.mutateAsync({ invoiceId, paymentId }),
  };
}

export function usePaymentAttachments(invoiceId: string, paymentId: string): UsePaymentAttachmentsReturn {
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading, error, refetch } = useQuery({
    queryKey: ["payment-attachments", invoiceId, paymentId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}/attachments`);
      if (!response.ok) {
        throw new Error("Failed to fetch attachments");
      }
      return response.json();
    },
    enabled: !!invoiceId && !!paymentId,
    staleTime: 60 * 1000, // 1 minute - attachments don't change frequently
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      paymentId, 
      file 
    }: { 
      invoiceId: string; 
      paymentId: string; 
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload attachment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-attachments", invoiceId, paymentId] });
      toast.success("File uploaded successfully!");
    },
    onError: (error: any) => {
      console.error("Error uploading attachment:", error);
      toast.error(error.message || "Failed to upload file");
    },
  });

  const downloadAttachmentMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      paymentId, 
      attachmentId 
    }: { 
      invoiceId: string; 
      paymentId: string; 
      attachmentId: string;
    }): Promise<AttachmentDownload> => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}/attachments/${attachmentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download attachment");
      }

      return response.json();
    },
    onError: (error: any) => {
      console.error("Error downloading attachment:", error);
      toast.error(error.message || "Failed to download file");
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      paymentId, 
      attachmentId 
    }: { 
      invoiceId: string; 
      paymentId: string; 
      attachmentId: string;
    }) => {
      const response = await fetch(`/api/invoices/${invoiceId}/payments/${paymentId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete attachment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-attachments", invoiceId, paymentId] });
      toast.success("File deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting attachment:", error);
      toast.error(error.message || "Failed to delete file");
    },
  });

  return {
    attachments,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    uploadAttachment: (invoiceId: string, paymentId: string, file: File) =>
      uploadAttachmentMutation.mutateAsync({ invoiceId, paymentId, file }),
    downloadAttachment: (invoiceId: string, paymentId: string, attachmentId: string) =>
      downloadAttachmentMutation.mutateAsync({ invoiceId, paymentId, attachmentId }),
    deleteAttachment: (invoiceId: string, paymentId: string, attachmentId: string) =>
      deleteAttachmentMutation.mutateAsync({ invoiceId, paymentId, attachmentId }),
  };
}