"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Stock status types for filtering
export type StockStatus = "all" | "in_stock" | "low_stock" | "critical" | "out_of_stock";

// Filter state for the inventory module
export interface InventoryFilters {
  searchTerm: string;
  stockStatus: StockStatus;
  selectedProductId: string | null;
  selectedProductName: string | null;
  selectedProductSku: string | null;
}

// Default filter values
const defaultFilters: InventoryFilters = {
  searchTerm: "",
  stockStatus: "all",
  selectedProductId: null,
  selectedProductName: null,
  selectedProductSku: null,
};

// Active tab type
export type InventoryTab = "overview" | "products" | "transactions";

// Context interface
interface InventoryFilterContextType {
  // Filter state
  filters: InventoryFilters;
  
  // Active tab
  activeTab: InventoryTab;
  setActiveTab: (tab: InventoryTab) => void;
  
  // Filter actions
  setSearchTerm: (term: string) => void;
  setStockStatus: (status: StockStatus) => void;
  selectProduct: (productId: string, productName: string, productSku: string) => void;
  clearProductSelection: () => void;
  resetFilters: () => void;
  
  // Navigation helpers
  viewProductTransactions: (productId: string, productName: string, productSku: string) => void;
}

// Create context
const InventoryFilterContext = createContext<InventoryFilterContextType | undefined>(undefined);

// Provider component
interface InventoryFilterProviderProps {
  children: ReactNode;
  defaultTab?: InventoryTab;
}

export function InventoryFilterProvider({ 
  children, 
  defaultTab = "overview" 
}: InventoryFilterProviderProps) {
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [activeTab, setActiveTab] = useState<InventoryTab>(defaultTab);

  // Set search term
  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  }, []);

  // Set stock status filter
  const setStockStatus = useCallback((status: StockStatus) => {
    setFilters(prev => ({ ...prev, stockStatus: status }));
  }, []);

  // Select a product for filtering
  const selectProduct = useCallback((
    productId: string, 
    productName: string, 
    productSku: string
  ) => {
    setFilters(prev => ({
      ...prev,
      selectedProductId: productId,
      selectedProductName: productName,
      selectedProductSku: productSku,
    }));
  }, []);

  // Clear product selection
  const clearProductSelection = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      selectedProductId: null,
      selectedProductName: null,
      selectedProductSku: null,
    }));
  }, []);

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Navigate to transactions tab with product filter
  const viewProductTransactions = useCallback((
    productId: string, 
    productName: string, 
    productSku: string
  ) => {
    selectProduct(productId, productName, productSku);
    setActiveTab("transactions");
  }, [selectProduct]);

  const value: InventoryFilterContextType = {
    filters,
    activeTab,
    setActiveTab,
    setSearchTerm,
    setStockStatus,
    selectProduct,
    clearProductSelection,
    resetFilters,
    viewProductTransactions,
  };

  return (
    <InventoryFilterContext.Provider value={value}>
      {children}
    </InventoryFilterContext.Provider>
  );
}

// Custom hook to use the context
export function useInventoryFilter() {
  const context = useContext(InventoryFilterContext);
  if (context === undefined) {
    throw new Error("useInventoryFilter must be used within an InventoryFilterProvider");
  }
  return context;
}

// Export the context for testing purposes
export { InventoryFilterContext };

