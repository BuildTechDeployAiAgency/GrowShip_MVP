"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopRegionsCountriesChart } from "@/components/sales/top-regions-countries-chart";
import { TopCustomersDistributorsChart } from "@/components/sales/top-customers-distributors-chart";
import { MapPin, Building2 } from "lucide-react";

export function RegionsAndCustomersTabs() {
  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Regional & Customer Analysis
          </CardTitle>
        </div>
        <p className="text-sm text-gray-600 mt-1 ml-3">
          Top performing regions and major customers/distributors
        </p>
      </CardHeader>
      <CardContent className="w-full overflow-x-auto pt-6">
        <Tabs defaultValue="regions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="regions" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Top Regions
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top Customers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regions" className="mt-0">
            <TopRegionsCountriesChart />
          </TabsContent>

          <TabsContent value="customers" className="mt-0">
            <TopCustomersDistributorsChart />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
