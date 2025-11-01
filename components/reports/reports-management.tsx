"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/main-layout";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useQuery } from "@tanstack/react-query";

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: any;
  lastGenerated?: string;
}

const availableReports: Report[] = [
  {
    id: "sales-summary",
    title: "Sales Summary Report",
    description: "Overview of sales performance by period",
    category: "Sales",
    icon: BarChart3,
  },
  {
    id: "revenue-analysis",
    title: "Revenue Analysis",
    description: "Detailed revenue breakdown and trends",
    category: "Financial",
    icon: TrendingUp,
  },
  {
    id: "inventory-report",
    title: "Inventory Report",
    description: "Current inventory levels and stock status",
    category: "Inventory",
    icon: Package,
  },
  {
    id: "financial-statement",
    title: "Financial Statement",
    description: "Complete financial overview and statements",
    category: "Financial",
    icon: DollarSign,
  },
  {
    id: "order-summary",
    title: "Order Summary",
    description: "Summary of all orders and fulfillment status",
    category: "Orders",
    icon: FileText,
  },
  {
    id: "monthly-performance",
    title: "Monthly Performance",
    description: "Monthly performance metrics and KPIs",
    category: "Analytics",
    icon: Calendar,
  },
];

export function ReportsManagement() {
  const { profile } = useEnhancedAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(availableReports.map((r) => r.category)))];

  const filteredReports =
    selectedCategory === "all"
      ? availableReports
      : availableReports.filter((r) => r.category === selectedCategory);

  return (
    <MainLayout
      pageTitle="Reports"
      pageSubtitle="Generate and download business reports"
      actions={
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Category Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Icon className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="mt-1">{report.category}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  {report.lastGenerated && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reports found in this category</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}