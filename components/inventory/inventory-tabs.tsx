"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryDashboard } from "./inventory-dashboard";
import { InventoryProductsList } from "./inventory-products-list";
import { InventoryTransactionsList } from "./inventory-transactions-list";
import { InventorySettingsContent } from "./inventory-settings-content";
import { useInventoryFilter, InventoryFilterProvider, InventoryTab } from "@/contexts/inventory-filter-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { LayoutDashboard, Package, History, AlertCircle, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Inner component that uses the context
function InventoryTabsContent() {
  const { activeTab, setActiveTab, filters, clearProductSelection } = useInventoryFilter();
  const { profile } = useEnhancedAuth();

  // Handle tab change
  const handleTabChange = (value: string) => {
    // If switching away from transactions and a product is selected, clear it
    if (value !== "transactions" && filters.selectedProductId) {
      clearProductSelection();
    }
    setActiveTab(value as InventoryTab);
  };

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={handleTabChange} 
      className="space-y-4"
    >
      <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="products" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Products</span>
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex items-center gap-2 relative">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Transactions</span>
          {filters.selectedProductId && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs"
            >
              <AlertCircle className="h-3 w-3" />
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
      </TabsList>

      {/* Selected Product Indicator */}
      {filters.selectedProductId && activeTab === "transactions" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
          <span className="text-teal-700">
            Filtering transactions for: <strong>{filters.selectedProductSku}</strong> - {filters.selectedProductName}
          </span>
          <button
            onClick={clearProductSelection}
            className="ml-auto text-teal-600 hover:text-teal-800 underline text-sm"
          >
            Clear filter
          </button>
        </div>
      )}

      <TabsContent value="overview" className="mt-4">
        <InventoryDashboard />
      </TabsContent>

      <TabsContent value="products" className="mt-4">
        <InventoryProductsList />
      </TabsContent>

      <TabsContent value="transactions" className="mt-4">
        <InventoryTransactionsList />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <InventorySettingsContent brandId={profile?.brand_id} />
      </TabsContent>
    </Tabs>
  );
}

// Main export with provider wrapper
export function InventoryTabs() {
  return (
    <InventoryFilterProvider defaultTab="overview">
      <InventoryTabsContent />
    </InventoryFilterProvider>
  );
}

