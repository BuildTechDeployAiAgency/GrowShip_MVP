"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Package, Clock, CheckCircle2, TruckIcon } from "lucide-react";

const fulfillmentData = [
  {
    status: "On-time Delivery",
    value: 94.5,
    count: 3456,
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
    progressColor: "bg-green-600",
  },
  {
    status: "In Transit",
    value: 285,
    count: 285,
    icon: TruckIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    isCount: true,
  },
  {
    status: "Processing",
    value: 142,
    count: 142,
    icon: Package,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    isCount: true,
  },
  {
    status: "Delayed",
    value: 23,
    count: 23,
    icon: Clock,
    color: "text-red-600",
    bgColor: "bg-red-100",
    isCount: true,
  },
];

const monthlyMetrics = [
  { month: "Jan", rate: 92.3 },
  { month: "Feb", rate: 93.1 },
  { month: "Mar", rate: 91.8 },
  { month: "Apr", rate: 93.5 },
  { month: "May", rate: 94.2 },
  { month: "Jun", rate: 94.8 },
  { month: "Jul", rate: 95.1 },
  { month: "Aug", rate: 94.7 },
  { month: "Sep", rate: 95.3 },
  { month: "Oct", rate: 94.5 },
];

export function OrderFulfillmentMetrics() {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Order Fulfillment
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Delivery performance and order status
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">94.5%</p>
            <p className="text-xs text-gray-600">On-time Rate</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {fulfillmentData.map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${item.bgColor} p-2 rounded-lg`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${item.color}`}>
                    {item.isCount ? item.value : `${item.value}%`}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {item.status}
              </p>
              {!item.isCount && <Progress value={item.value} className="h-2" />}
              {item.isCount && (
                <p className="text-xs text-gray-600">{item.count} orders</p>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            Monthly On-time Delivery Rate
          </h4>
          <div className="space-y-3">
            {monthlyMetrics.slice(-5).map((metric, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-8">
                  {metric.month}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Progress value={metric.rate} className="h-2 flex-1" />
                    <span className="text-xs font-semibold text-gray-900 w-12">
                      {metric.rate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">142</p>
            <p className="text-xs text-gray-600 mt-1">Pending Orders</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">$387K</p>
            <p className="text-xs text-gray-600 mt-1">Pending Value</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
