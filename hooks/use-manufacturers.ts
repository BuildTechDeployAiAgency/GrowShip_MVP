import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type ManufacturerStatus = "active" | "inactive" | "archived";

export interface Manufacturer {
  id: string;
  brand_id: string;
  name: string;
  code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status: ManufacturerStatus;
  currency?: string;
  tax_id?: string;
  payment_terms?: string;
  orders_count?: number;
  revenue_to_date?: number;
  margin_percent?: number;
  contract_start?: string;
  contract_end?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseManufacturersOptions {
  searchTerm?: string;
  filters?: {
    status?: string;
    country?: string;
  };
  brandId?: string;
  isSuperAdmin?: boolean;
}

// Helper function to generate next manufacturer code
const generateNextManufacturerCode = (existingManufacturers: Manufacturer[]): string => {
  // Extract all codes that match MFR-XXX pattern
  const codes = existingManufacturers
    .map(m => m.code)
    .filter((code): code is string => !!code && code.startsWith('MFR-'));
  
  // Extract numbers from codes
  const numbers = codes
    .map(code => {
      const match = code.match(/^MFR-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));
  
  // Find the highest number
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  
  // Generate next code
  const nextNumber = maxNumber + 1;
  return `MFR-${nextNumber.toString().padStart(3, '0')}`;
};

export function useManufacturers({
  searchTerm = "",
  filters = {},
  brandId,
  isSuperAdmin = false,
}: UseManufacturersOptions = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch manufacturers
  const {
    data: manufacturers = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["manufacturers", searchTerm, filters, brandId],
    queryFn: async () => {
      let query = supabase
        .from("manufacturers")
        .select("*")
        .order("name", { ascending: true });

      // Brand filtering (unless super admin viewing all)
      if (!isSuperAdmin && brandId) {
        query = query.eq("brand_id", brandId);
      }

      // Status filter
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Country filter
      if (filters.country && filters.country !== "all") {
        query = query.eq("country", filters.country);
      }

      // Search filter
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Manufacturer[];
    },
    enabled: !!brandId || isSuperAdmin,
  });

  // Function to get next manufacturer code
  const getNextManufacturerCode = async (brandId: string): Promise<string> => {
    // Fetch all manufacturers for this brand to determine next code
    const { data, error } = await supabase
      .from("manufacturers")
      .select("code")
      .eq("brand_id", brandId)
      .order("code", { ascending: false });

    if (error) {
      console.error("Error fetching manufacturers for code generation:", error);
      return "MFR-001"; // Default if error
    }

    return generateNextManufacturerCode(data as Manufacturer[]);
  };

  // Create manufacturer
  const createManufacturer = useMutation({
    mutationFn: async (newManufacturer: Partial<Manufacturer>) => {
      const { data, error } = await supabase
        .from("manufacturers")
        .insert([newManufacturer])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast.success("Manufacturer created successfully!");
    },
    onError: (error: any) => {
      console.error("Create manufacturer error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to create manufacturer";
      
      if (error.code === "23505") {
        // Unique constraint violation (duplicate code)
        errorMessage = "A manufacturer with this code already exists. Please use a different code.";
      } else if (error.code === "42501") {
        // RLS policy violation
        errorMessage = "You don't have permission to create manufacturers. Please check your account settings.";
      } else if (error.code === "23503") {
        // Foreign key violation
        errorMessage = "Invalid brand or reference data. Please contact support.";
      } else if (error.code === "23514") {
        // Check constraint violation
        errorMessage = "Invalid data provided. Please check your input and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      // Don't re-throw - let the component handle the error
    },
  });

  // Update manufacturer
  const updateManufacturer = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Manufacturer>;
    }) => {
      const { data, error } = await supabase
        .from("manufacturers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast.success("Manufacturer updated successfully!");
    },
    onError: (error: any) => {
      console.error("Update manufacturer error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to update manufacturer";
      
      if (error.code === "23505") {
        // Unique constraint violation (duplicate code)
        errorMessage = "A manufacturer with this code already exists. Please use a different code.";
      } else if (error.code === "42501") {
        // RLS policy violation
        errorMessage = "You don't have permission to update this manufacturer.";
      } else if (error.code === "23514") {
        // Check constraint violation
        errorMessage = "Invalid data provided. Please check your input and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      // Don't re-throw - let the component handle the error
    },
  });

  // Delete manufacturer
  const deleteManufacturer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manufacturers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast.success("Manufacturer deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Delete manufacturer error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to delete manufacturer";
      
      if (error.code === "23503") {
        // Foreign key violation (related records exist)
        errorMessage = "Cannot delete manufacturer. It has related records (products, orders, etc.). Please remove those first.";
      } else if (error.code === "42501") {
        // RLS policy violation
        errorMessage = "You don't have permission to delete this manufacturer.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      // Don't re-throw - let the component handle the error
    },
  });

  return {
    manufacturers,
    loading,
    error: queryError?.message,
    totalCount: manufacturers.length,
    createManufacturer: createManufacturer.mutateAsync,
    updateManufacturer: (id: string, updates: Partial<Manufacturer>) =>
      updateManufacturer.mutateAsync({ id, updates }),
    deleteManufacturer: deleteManufacturer.mutateAsync,
    getNextManufacturerCode,
    refetch,
  };
}

