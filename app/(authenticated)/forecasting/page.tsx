"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useRequireProfile } from "@/hooks/use-auth";
import { ProtectedPage } from "@/components/common/protected-page";
import { ForecastChart } from "@/components/forecasting/forecast-chart";
import { ForecastTable } from "@/components/forecasting/forecast-table";
import { GenerateForecastDialog } from "@/components/forecasting/generate-forecast-dialog";
import { useForecasting } from "@/hooks/use-forecasting";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function ForecastingPage() {
  const { user, profile, loading } = useRequireProfile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [metric, setMetric] = useState<"quantity" | "revenue">("quantity");
  const [algorithmFilter, setAlgorithmFilter] = useState<string>("all");

  if (loading) {
    return (
      <MainLayout pageTitle="Demand Forecasting" pageSubtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedPage allowedStatuses={["approved"]}>
      <ForecastingContent
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        selectedSku={selectedSku}
        setSelectedSku={setSelectedSku}
        metric={metric}
        setMetric={setMetric}
        algorithmFilter={algorithmFilter}
        setAlgorithmFilter={setAlgorithmFilter}
      />
    </ProtectedPage>
  );
}

function ForecastingContent({
  isDialogOpen,
  setIsDialogOpen,
  selectedSku,
  setSelectedSku,
  metric,
  setMetric,
  algorithmFilter,
  setAlgorithmFilter,
}: {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  metric: "quantity" | "revenue";
  setMetric: (metric: "quantity" | "revenue") => void;
  algorithmFilter: string;
  setAlgorithmFilter: (algorithm: string) => void;
}) {
  const { profile } = useEnhancedAuth();
  const { forecasts, isLoading, refetch } = useForecasting({
    sku: selectedSku || undefined,
    algorithm: algorithmFilter !== "all" ? algorithmFilter : undefined,
    enabled: true,
  });

  const filteredForecasts = forecasts || [];

  return (
    <MainLayout
      pageTitle="Demand Forecasting"
      pageSubtitle="3-6 month demand forecasts based on historical sales"
      actions={
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Forecast
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sku-filter">Filter by SKU</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="sku-filter"
                    placeholder="Search SKU..."
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="metric-select">Metric</Label>
                <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quantity">Quantity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="algorithm-filter">Algorithm</Label>
                <Select value={algorithmFilter} onValueChange={setAlgorithmFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Algorithms</SelectItem>
                    <SelectItem value="simple_moving_average">Simple Moving Average</SelectItem>
                    <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                    <SelectItem value="trend_analysis">Trend Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              </div>
            </CardContent>
          </Card>
        ) : filteredForecasts.length > 0 ? (
          <>
            <ForecastChart
              forecasts={filteredForecasts}
              metric={metric}
              sku={selectedSku || undefined}
            />
            <ForecastTable forecasts={filteredForecasts} />
          </>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Forecasts Available
                </h3>
                <p className="text-gray-600 mb-4">
                  Generate your first forecast to see predictions based on historical sales data.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Forecast
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <GenerateForecastDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => {
            setIsDialogOpen(false);
            refetch();
          }}
        />
      </div>
    </MainLayout>
  );
}

