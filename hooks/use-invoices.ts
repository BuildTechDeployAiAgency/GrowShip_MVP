"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_paid";

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id?: string;
  user_id?: string;
  brand_id: string;
  distributor_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  subtotal?: number;
  tax_total?: number;
  discount_total?: number;
  total_amount?: number;
  currency?: string;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_date?: string;
  invoice_date: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface InvoiceFilters {
  paymentStatus: string;
  dateRange: string;
  distributorId?: string;
}

interface UseInvoicesOptions {
  searchTerm: string;
  filters: InvoiceFilters;
  brandId?: string;
  distributorId?: string; // For distributor_admin users, auto-filter by their distributor_id
  debounceMs?: number;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createInvoice: (invoice: Partial<Invoice>) => Promise<Invoice>;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (invoiceId: string) => Promise<void>;
  totalCount: number;
}

async function fetchInvoices(
  debouncedSearchTerm: string,
  filters: InvoiceFilters,
  brandId?: string,
  distributorId?: string
): Promise<{ invoices: Invoice[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("invoices").select("*", { count: "exact" });

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
      `invoice_number.ilike.%${debouncedSearchTerm}%,customer_name.ilike.%${debouncedSearchTerm}%,customer_email.ilike.%${debouncedSearchTerm}%`
    );
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
    
    query = query.gte("invoice_date", startDate.toISOString());
  }

  query = query.order("invoice_date", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  return {
    invoices: data || [],
    totalCount: count || 0,
  };
}

export function useInvoices({
  searchTerm,
  filters,
  brandId,
  distributorId,
  debounceMs = 300,
}: UseInvoicesOptions): UseInvoicesReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["invoices", debouncedSearchTerm, filters, brandId, distributorId],
    queryFn: () => fetchInvoices(debouncedSearchTerm, filters, brandId, distributorId),
    staleTime: 5 * 60 * 1000, // 5 minutes - invoice data doesn't change frequently
    refetchOnWindowFocus: false,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoice: Partial<Invoice>): Promise<Invoice> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate due date based on distributor payment terms
      let dueDate = invoice.due_date;
      
      if (!dueDate && invoice.distributor_id) {
        // Fetch distributor payment terms
        let paymentTermsDays = 30; // Default to 30 days
        
        const { data: distributor } = await supabase
          .from("distributors")
          .select("payment_terms")
          .eq("id", invoice.distributor_id)
          .single();
        
        if (distributor?.payment_terms) {
          // Parse payment terms - handle formats like "30", "Net 30", "COD", etc.
          const paymentTerms = distributor.payment_terms.trim().toLowerCase();
          
          if (paymentTerms === "cod" || paymentTerms === "cash on delivery") {
            paymentTermsDays = 0; // Payment due immediately
          } else {
            // Extract number from payment terms (e.g., "30" from "Net 30" or "30 days")
            const match = paymentTerms.match(/(\d+)/);
            if (match) {
              paymentTermsDays = parseInt(match[1], 10);
            }
          }
        }
        
        // Calculate due date
        const invoiceDate = new Date(invoice.invoice_date || new Date().toISOString());
        const calculatedDueDate = new Date(invoiceDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);
        dueDate = calculatedDueDate.toISOString();
      }

      const invoiceData = {
        ...invoice,
        user_id: user?.id,
        invoice_number: `INV-${Date.now()}`,
        invoice_date: invoice.invoice_date || new Date().toISOString(),
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data: newInvoice, error: createError } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newInvoice;
    },
    onSuccess: (newInvoice) => {
      // Invalidate specific invoice queries instead of all
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Invoice created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating invoice:", error);
      toast.error(error?.message || "Failed to create invoice. Please try again.");
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      updates,
    }: {
      invoiceId: string;
      updates: Partial<Invoice>;
    }): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("invoices")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate specific invoice queries instead of all
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Invoice updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating invoice:", error);
      toast.error(error?.message || "Failed to update invoice. Please try again.");
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate specific invoice queries instead of all
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Invoice deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting invoice:", error);
      toast.error(error?.message || "Failed to delete invoice. Please try again.");
    },
  });

  return {
    invoices: data?.invoices || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createInvoice: async (invoice: Partial<Invoice>) => {
      return await createInvoiceMutation.mutateAsync(invoice);
    },
    updateInvoice: async (invoiceId: string, updates: Partial<Invoice>) => {
      await updateInvoiceMutation.mutateAsync({ invoiceId, updates });
    },
    deleteInvoice: async (invoiceId: string) => {
      await deleteInvoiceMutation.mutateAsync(invoiceId);
    },
    totalCount: data?.totalCount || 0,
  };
}

