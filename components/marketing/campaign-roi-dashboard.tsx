"use client";

import { CampaignROIDashboardProps } from "@/types/marketing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Target, BarChart3 } from "lucide-react";

export function CampaignROIDashboard({ 
  brandId, 
  distributorId, 
  timeframe = "12m",
  onCampaignClick 
}: CampaignROIDashboardProps) {
  
  // Placeholder component - will be implemented with full ROI analytics
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">24.5%</div>
            <p className="text-sm text-gray-600">+5.2% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$125,430</div>
            <p className="text-sm text-gray-600">From 15 active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Cost per Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45</div>
            <p className="text-sm text-gray-600">-$12 from target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              ROAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2x</div>
            <p className="text-sm text-gray-600">Return on ad spend</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROI Dashboard - Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ROI Analytics Dashboard
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Comprehensive ROI tracking with campaign performance comparisons, 
              trend analysis, and predictive modeling will be available here.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Badge variant="outline">Campaign Comparison</Badge>
              <Badge variant="outline">ROI Trends</Badge>
              <Badge variant="outline">Channel Analysis</Badge>
              <Badge variant="outline">Predictive Modeling</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}