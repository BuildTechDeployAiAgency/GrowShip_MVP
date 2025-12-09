"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DateFilters {
  year: number;
  month?: number;
  distributorId?: string | null;
}

interface DateFilterContextType {
  filters: DateFilters;
  setFilters: (filters: DateFilters) => void;
  setDistributorFilter: (distributorId: string | null) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

interface DateFilterProviderProps {
  children: ReactNode;
}

export function DateFilterProvider({ children }: DateFilterProviderProps) {
  // Initialize with a static value to prevent hydration mismatch
  const [filters, setFilters] = useState<DateFilters>({
    year: 2025, // Will be updated on client mount
    distributorId: null,
  });

  // Update to current year after mount (client-side only)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setFilters((prev) => ({ ...prev, year: currentYear }));
  }, []);

  const setDistributorFilter = (distributorId: string | null) => {
    setFilters((prev) => ({ ...prev, distributorId }));
  };

  return (
    <DateFilterContext.Provider value={{ filters, setFilters, setDistributorFilter }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilters() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error("useDateFilters must be used within a DateFilterProvider");
  }
  return context;
}
