"use client";

import { Distributor } from "@/hooks/use-distributors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, ShoppingCart, Target, TrendingUp } from "lucide-react";

interface DistributorHeaderProps {
  distributor: Distributor;
}

export function DistributorHeader({ distributor }: DistributorHeaderProps) {
  const formatCurrency = (amount?: number, currency?: string) => {
    if (amount === undefined || amount === null) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Distributor Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{distributor.name}</h1>
            <Badge className={getStatusColor(distributor.status)}>
              {distributor.status}
            </Badge>
          </div>
          {distributor.code && (
            <p className="text-sm text-gray-600">{distributor.code}</p>
          )}
          {(distributor.city || distributor.country) && (
            <p className="text-sm text-gray-500">
              {distributor.city && distributor.country
                ? `${distributor.city}, ${distributor.country}`
                : distributor.city || distributor.country}
            </p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(distributor.revenue_to_date, distributor.currency)}
                </p>
              </div>
              <div className="p-3 bg-teal-100 rounded-full">
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {distributor.orders_count || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {distributor.orders_count && distributor.orders_count > 0
                    ? formatCurrency(
                        (distributor.revenue_to_date || 0) / distributor.orders_count,
                        distributor.currency
                      )
                    : formatCurrency(0, distributor.currency)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Margin</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {distributor.margin_percent !== undefined && distributor.margin_percent !== null
                    ? `${distributor.margin_percent}%`
                    : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
