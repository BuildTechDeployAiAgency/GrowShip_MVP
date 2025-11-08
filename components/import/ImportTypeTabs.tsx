"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ImportTypeTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children?: React.ReactNode;
}

export function ImportTypeTabs({ activeTab, onTabChange, children }: ImportTypeTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-1 lg:w-96">
        <TabsTrigger value="orders">Orders Import</TabsTrigger>
        {/* Future tabs can be added here */}
        {/* <TabsTrigger value="products">Products Import</TabsTrigger> */}
        {/* <TabsTrigger value="customers">Customers Import</TabsTrigger> */}
      </TabsList>
      
      <TabsContent value="orders" className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  );
}

