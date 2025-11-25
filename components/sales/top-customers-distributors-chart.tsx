"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Store, Building2 } from "lucide-react";

// TODO: Replace hardcoded data with real API integration
// This component currently uses mock data and should be updated to fetch real customer/distributor data

const data = [
  {
    name: "Walmart",
    revenue: 1285000,
    orders: 3450,
    growth: 15.3,
    isPositive: true,
  },
  {
    name: "Target",
    revenue: 987000,
    orders: 2890,
    growth: 12.8,
    isPositive: true,
  },
  {
    name: "Costco",
    revenue: 856000,
    orders: 2340,
    growth: -3.2,
    isPositive: false,
  },
  {
    name: "Amazon",
    revenue: 745000,
    orders: 5680,
    growth: 22.5,
    isPositive: true,
  },
  {
    name: "Best Buy",
    revenue: 414500,
    orders: 1560,
    growth: 8.7,
    isPositive: true,
  },
];

// Single blue color for all bars
const SINGLE_COLOR = "#3b82f6";

export function TopCustomersDistributorsChart() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border-2 border-blue-200 relative">
      {/* Data Mapping Needed Banner */}
      <div className="absolute top-4 right-4 z-10 bg-yellow-500 text-yellow-900 px-3 py-1.5 rounded-lg shadow-lg border-2 border-yellow-600 font-semibold text-xs flex items-center gap-2">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Data Mapping Needed
      </div>
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                Top Customers/Distributors
              </CardTitle>
              <p className="text-sm text-blue-100 mt-1">
                Major customers and distributors by revenue and order volume
              </p>
            </div>
          </div>
          <div className="text-right bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-2xl font-bold text-white">$4.29M</p>
            <p className="text-xs text-blue-100">Combined Revenue</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
              <XAxis
                dataKey="name"
                stroke="#1e40af"
                style={{ fontSize: "12px", fontWeight: 500 }}
              />
              <YAxis
                stroke="#1e40af"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e40af",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Revenue",
                ]}
              />
              <Bar
                dataKey="revenue"
                radius={[8, 8, 0, 0]}
                fill={SINGLE_COLOR}
              />
            </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {data.map((customer, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white border-2 border-blue-200 rounded-xl hover:shadow-md hover:border-blue-400 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-md bg-blue-500">
                      {index + 1}
                    </div>
                    <Store className="absolute -top-1 -right-1 h-4 w-4 text-blue-600 bg-white rounded-full p-0.5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{customer.name}</p>
                    <p className="text-sm text-blue-600 font-medium">
                      {customer.orders.toLocaleString()} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900">
                    ${(customer.revenue / 1000).toFixed(0)}k
                  </p>
                  <div
                    className={`flex items-center gap-1 text-sm font-bold justify-end ${
                      customer.isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {customer.isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {customer.isPositive ? "+" : ""}
                      {customer.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
