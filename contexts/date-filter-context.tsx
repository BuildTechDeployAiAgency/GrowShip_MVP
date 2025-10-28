"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DateFilters {
  year: number;
  month?: number;
}

interface DateFilterContextType {
  filters: DateFilters;
  setFilters: (filters: DateFilters) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

interface DateFilterProviderProps {
  children: ReactNode;
}

export function DateFilterProvider({ children }: DateFilterProviderProps) {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<DateFilters>({
    year: currentYear,
  });

  return (
    <DateFilterContext.Provider value={{ filters, setFilters }}>
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
