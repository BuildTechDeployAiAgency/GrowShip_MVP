"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Building2, Package, Factory } from "lucide-react";

interface DemoAccessSectionProps {
  onBrandDemo: () => void;
  onDistributorDemo: () => void;
  onManufacturerDemo: () => void;
}

export function DemoAccessSection({
  onBrandDemo,
  onDistributorDemo,
  onManufacturerDemo,
}: DemoAccessSectionProps) {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-teal-500 to-green-500 p-8">
              <div className="text-center text-white">
                <div className="w-16 h-16 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-teal-600" />
                </div>

                <h2 className="text-3xl font-bold mb-4">Demo Access Enabled</h2>
                <p className="text-lg mb-8 max-w-2xl mx-auto">
                  Experience the full scope of both portals without
                  registration. Perfect for evaluation and hands-on testing.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={onBrandDemo}
                    variant="secondary"
                    size="lg"
                    className="bg-white text-teal-600 hover:bg-gray-50"
                  >
                    <Building className="w-5 h-5 mr-2" />
                    Launch Brand Demo
                  </Button>

                  <Button
                    onClick={onDistributorDemo}
                    size="lg"
                    className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Launch Distributor Demo
                  </Button>

                  <Button
                    onClick={onManufacturerDemo}
                    size="lg"
                    className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                  >
                    <Factory className="w-5 h-5 mr-2" />
                    Launch Manufacturer Demo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
