"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ImportTypeTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children?: React.ReactNode;
  showProducts?: boolean;
}

export function ImportTypeTabs({ activeTab, onTabChange, children, showProducts = false }: ImportTypeTabsProps) {
  const tabCount = showProducts ? 3 : 2;
  
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className={`grid w-full grid-cols-${tabCount} lg:w-[${showProducts ? '700' : '500'}px]`}>
        <TabsTrigger value="orders">Orders Import</TabsTrigger>
        <TabsTrigger value="sales">Sales Import</TabsTrigger>
        {showProducts && <TabsTrigger value="products">Products Import</TabsTrigger>}
      </TabsList>
      
      <TabsContent value="orders" className="mt-6">
        {children}
      </TabsContent>
      
      <TabsContent value="sales" className="mt-6">
        {children}
      </TabsContent>
      
      {showProducts && (
        <TabsContent value="products" className="mt-6">
          {children}
        </TabsContent>
      )}
    </Tabs>
  );
}

