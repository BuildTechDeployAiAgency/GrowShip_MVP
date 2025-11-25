"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDistributors } from "@/hooks/use-distributors";
import { usePurchaseOrders } from "@/hooks/use-purchase-orders";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";
import {
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Download,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface MonthlyReport {
  id: string;
  brand_id: string;
  distributor_id: string;
  purchase_order_id?: string;
  report_month: string;
  total_orders: number;
  total_units: number;
  total_sales: number;
  fill_rate?: number;
  status: string;
  submitted_at?: string;
  distributors?: { name: string };
  brands?: { name: string };
}

export function MonthlyReportsDashboard() {
  const { profile, canPerformAction } = useEnhancedAuth();
  const isSuperAdmin = canPerformAction("view_all_users");
  const isDistributorAdmin = profile?.role_name?.startsWith("distributor_");

  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [selectedDistributor, setSelectedDistributor] = useState<string>("all");
  const [selectedPO, setSelectedPO] = useState<string>("all");

  const { distributors } = useDistributors({
    searchTerm: "",
    filters: { status: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
    isSuperAdmin,
  });

  const { purchaseOrders } = usePurchaseOrders({
    searchTerm: "",
    filters: { status: "all", paymentStatus: "all", dateRange: "all" },
    brandId: isSuperAdmin ? undefined : profile?.brand_id,
    distributorId: isDistributorAdmin ? profile?.distributor_id : undefined,
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);

      if (selectedDistributor !== "all") {
        params.append("distributor_id", selectedDistributor);
      }

      if (selectedPO !== "all") {
        params.append("purchase_order_id", selectedPO);
      }

      const response = await fetch(`/api/reports/monthly?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch reports");
      }

      setReports(data.reports || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error(error.message || "Failed to fetch monthly reports");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const body: any = {
        month: selectedMonth,
      };

      if (selectedDistributor !== "all") {
        body.distributor_id = selectedDistributor;
      }

      if (selectedPO !== "all") {
        body.purchase_order_id = selectedPO;
      }

      const response = await fetch("/api/reports/monthly/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      toast.success("Report generated successfully!");
      fetchReports();
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error(error.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedDistributor, selectedPO, profile]);

  // Calculate aggregate metrics
  const aggregateMetrics = reports.reduce(
    (acc, report) => ({
      totalOrders: acc.totalOrders + report.total_orders,
      totalUnits: acc.totalUnits + report.total_units,
      totalSales: acc.totalSales + report.total_sales,
      avgFillRate: report.fill_rate
        ? acc.avgFillRate + report.fill_rate
        : acc.avgFillRate,
      reportsWithFillRate: report.fill_rate
        ? acc.reportsWithFillRate + 1
        : acc.reportsWithFillRate,
    }),
    {
      totalOrders: 0,
      totalUnits: 0,
      totalSales: 0,
      avgFillRate: 0,
      reportsWithFillRate: 0,
    }
  );

  const averageFillRate =
    aggregateMetrics.reportsWithFillRate > 0
      ? aggregateMetrics.avgFillRate / aggregateMetrics.reportsWithFillRate
      : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <input
                type="month"
                value={selectedMonth.substring(0, 7)}
                onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {distributors.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Distributor</label>
                <Select
                  value={selectedDistributor}
                  onValueChange={setSelectedDistributor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Distributors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distributors</SelectItem>
                    {distributors.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id}>
                        {dist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {purchaseOrders.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Order</label>
                <Select value={selectedPO} onValueChange={setSelectedPO}>
                  <SelectTrigger>
                    <SelectValue placeholder="All POs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Purchase Orders</SelectItem>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 flex items-end">
              <Button
                onClick={handleGenerateReport}
                disabled={generating}
                className="w-full"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`}
                />
                {generating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aggregateMetrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              For {format(new Date(selectedMonth), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregateMetrics.totalUnits.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Units sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              USD {aggregateMetrics.totalSales.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fill Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageFillRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {aggregateMetrics.reportsWithFillRate} PO(s) tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Monthly Reports</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">No reports found</p>
              <p className="text-sm">Generate a report to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Distributor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Orders
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Units
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Sales
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Fill Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(report.report_month), "MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {report.distributors?.name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {report.total_orders}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {report.total_units.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-teal-600">
                        USD {report.total_sales.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {report.fill_rate ? `${report.fill_rate.toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          className={
                            report.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : report.status === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {report.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

