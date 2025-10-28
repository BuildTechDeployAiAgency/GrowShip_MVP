"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", target: 400000, actual: 385000, achievement: 96.3 },
  { month: "Feb", target: 410000, actual: 398000, achievement: 97.1 },
  { month: "Mar", target: 420000, actual: 412000, achievement: 98.1 },
  { month: "Apr", target: 430000, actual: 425000, achievement: 98.8 },
  { month: "May", target: 440000, actual: 438000, achievement: 99.5 },
  { month: "Jun", target: 450000, actual: 455000, achievement: 101.1 },
  { month: "Jul", target: 460000, actual: 468000, achievement: 101.7 },
  { month: "Aug", target: 470000, actual: 482000, achievement: 102.6 },
  { month: "Sep", target: 480000, actual: 495000, achievement: 103.1 },
  { month: "Oct", target: 490000, actual: 510000, achievement: 104.1 },
];

export function TargetsVsActualsChart() {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Targets vs Actuals
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Monthly Sales Performance & Achievement Rate
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-600">87.2%</p>
            <p className="text-xs text-gray-600">Q4 Target</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full min-w-0">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              yAxisId="left"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "achievement")
                  return [`${value.toFixed(1)}%`, "Achievement"];
                return [
                  `$${value.toLocaleString()}`,
                  name === "target" ? "Target" : "Actual",
                ];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) =>
                value.charAt(0).toUpperCase() + value.slice(1)
              }
            />
            <Bar
              yAxisId="left"
              dataKey="target"
              fill="#e5e7eb"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="actual"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="achievement"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", r: 4 }}
            />
          </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
