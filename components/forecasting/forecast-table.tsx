"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DemandForecast } from "@/hooks/use-forecasting";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ForecastTableProps {
  forecasts: Array<DemandForecast & {
    actual_quantity?: number;
    actual_revenue?: number;
    quantity_variance?: number;
    revenue_variance?: number;
  }>;
  onExport?: () => void;
}

export function ForecastTable({ forecasts, onExport }: ForecastTableProps) {
  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }

    // Default export to CSV
    const headers = [
      "SKU",
      "Period Start",
      "Period End",
      "Forecasted Quantity",
      "Actual Quantity",
      "Quantity Variance %",
      "Forecasted Revenue",
      "Actual Revenue",
      "Revenue Variance %",
      "Confidence Level",
      "Algorithm",
    ];

    const rows = forecasts.map((f) => [
      f.sku,
      f.forecast_period_start,
      f.forecast_period_end,
      f.forecasted_quantity?.toLocaleString() || "0",
      f.actual_quantity?.toLocaleString() || "-",
      f.quantity_variance?.toFixed(2) || "-",
      f.forecasted_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00",
      f.actual_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "-",
      f.revenue_variance?.toFixed(2) || "-",
      `${f.confidence_level.toFixed(1)}%`,
      f.algorithm_version,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forecasts_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Forecasts exported successfully");
  };

  const getVarianceColor = (variance?: number) => {
    if (variance === undefined || variance === null) return "bg-gray-100 text-gray-800";
    if (variance >= 10) return "bg-green-100 text-green-800";
    if (variance <= -10) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return "bg-green-100 text-green-800";
    if (confidence >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Forecast Details</h3>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {forecasts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No forecasts available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Forecasted Qty</TableHead>
                  <TableHead>Actual Qty</TableHead>
                  <TableHead>Qty Variance</TableHead>
                  <TableHead>Forecasted Revenue</TableHead>
                  <TableHead>Actual Revenue</TableHead>
                  <TableHead>Revenue Variance</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Algorithm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map((forecast) => (
                  <TableRow key={forecast.id}>
                    <TableCell className="font-medium">{forecast.sku}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(forecast.forecast_period_start), "MMM dd")} -{" "}
                      {format(new Date(forecast.forecast_period_end), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{forecast.forecasted_quantity?.toLocaleString() || "0"}</TableCell>
                    <TableCell>
                      {forecast.actual_quantity !== undefined
                        ? forecast.actual_quantity.toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {forecast.quantity_variance !== undefined ? (
                        <Badge className={getVarianceColor(forecast.quantity_variance)}>
                          {forecast.quantity_variance >= 0 ? "+" : ""}
                          {forecast.quantity_variance.toFixed(1)}%
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      ${forecast.forecasted_revenue?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </TableCell>
                    <TableCell>
                      {forecast.actual_revenue !== undefined
                        ? `$${forecast.actual_revenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {forecast.revenue_variance !== undefined ? (
                        <Badge className={getVarianceColor(forecast.revenue_variance)}>
                          {forecast.revenue_variance >= 0 ? "+" : ""}
                          {forecast.revenue_variance.toFixed(1)}%
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getConfidenceColor(forecast.confidence_level)}>
                        {forecast.confidence_level.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {forecast.algorithm_version.replace(/_/g, " ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

