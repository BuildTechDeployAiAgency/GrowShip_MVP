"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DemandForecast } from "@/hooks/use-forecasting";

interface ForecastChartProps {
  forecasts: Array<DemandForecast & {
    actual_quantity?: number;
    actual_revenue?: number;
    quantity_variance?: number;
    revenue_variance?: number;
  }>;
  metric?: "quantity" | "revenue";
  sku?: string;
}

export function ForecastChart({
  forecasts,
  metric = "quantity",
  sku,
}: ForecastChartProps) {
  // Filter by SKU if provided
  const filteredForecasts = sku
    ? forecasts.filter((f) => f.sku === sku)
    : forecasts;

  // Group by period for chart
  const chartData = filteredForecasts.map((forecast) => {
    const period = `${forecast.forecast_period_start} to ${forecast.forecast_period_end}`;
    return {
      period,
      sku: forecast.sku,
      forecasted: metric === "quantity" ? forecast.forecasted_quantity : forecast.forecasted_revenue,
      actual: metric === "quantity" ? forecast.actual_quantity || 0 : forecast.actual_revenue || 0,
      confidence: forecast.confidence_level,
      variance: metric === "quantity" ? forecast.quantity_variance || 0 : forecast.revenue_variance || 0,
    };
  });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-600">No forecast data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Forecast vs Actual - {metric === "quantity" ? "Quantity" : "Revenue"}
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          {sku ? `SKU: ${sku}` : "All SKUs"} • Comparison of forecasted vs actual performance
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => {
                if (metric === "quantity") {
                  return value.toLocaleString();
                }
                return `$${(value / 1000).toFixed(0)}k`;
              }}
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
                if (name === "confidence") {
                  return [`${value.toFixed(1)}%`, "Confidence"];
                }
                if (name === "variance") {
                  return [`${value.toFixed(1)}%`, "Variance"];
                }
                if (metric === "revenue") {
                  return [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name === "forecasted" ? "Forecasted" : "Actual"];
                }
                return [value.toLocaleString(), name === "forecasted" ? "Forecasted" : "Actual"];
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
              dataKey="forecasted"
              fill="#e5e7eb"
              radius={[4, 4, 0, 0]}
              name="Forecasted"
            />
            <Bar
              yAxisId="left"
              dataKey="actual"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
              name="Actual"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="confidence"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Confidence %"
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#9ca3af" strokeDasharray="2 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

