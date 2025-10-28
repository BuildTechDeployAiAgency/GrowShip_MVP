"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Package, Factory, Unlock } from "lucide-react";

interface HeroSectionProps {
  onBrandLogin: () => void;
  onDistributorLogin: () => void;
  onManufacturerLogin: () => void;
}

export function HeroSection({
  onBrandLogin,
  onDistributorLogin,
  onManufacturerLogin,
}: HeroSectionProps) {
  return (
    <section className="py-16 bg-gradient-to-br from-teal-50 to-green-50 relative">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Welcome to GrowShip
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Achieve seamless product distribution with a comprehensive B2B
          platform that connects brands with distributors through automated
          order management, financial visibility, and data-driven growth
          intelligence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            onClick={onBrandLogin}
            size="lg"
            className="flex items-center justify-center px-8 py-4 bg-teal-600 text-white text-lg font-semibold hover:bg-teal-700"
          >
            <Building className="w-6 h-6 mr-2" />
            Enter Brand Portal
          </Button>
          <Button
            onClick={onDistributorLogin}
            variant="outline"
            size="lg"
            className="flex items-center justify-center px-8 py-4 border-2 border-teal-600 text-teal-600 text-lg font-semibold hover:bg-teal-50"
          >
            <Package className="w-6 h-6 mr-2" />
            Enter Distributor Portal
          </Button>
          <Button
            onClick={onManufacturerLogin}
            variant="outline"
            size="lg"
            className="flex items-center justify-center px-8 py-4 border-2 border-blue-600 text-blue-600 text-lg font-semibold hover:bg-blue-50"
          >
            <Factory className="w-6 h-6 mr-2" />
            Enter Manufacturer Portal
          </Button>
        </div>

        <Card className="inline-block shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Demo Access Enabled</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Explore platform capabilities without registration
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-teal-200 rounded-full opacity-20 animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-32 w-80 h-80 bg-green-200 rounded-full opacity-20 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>
    </section>
  );
}
