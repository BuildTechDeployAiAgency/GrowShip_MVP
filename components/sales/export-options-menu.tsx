"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileJson, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  exportToExcel,
  exportToCSV,
  exportToJSON,
  generateSampleSalesData,
} from "@/lib/export-utils";
import { toast } from "react-toastify";

interface ExportOptionsMenuProps {
  data?: any[];
  fileName?: string;
}

export function ExportOptionsMenu({
  data,
  fileName = "sales_dashboard_data",
}: ExportOptionsMenuProps) {
  const handleExport = (format: "excel" | "csv" | "json") => {
    try {
      const exportData = data || generateSampleSalesData();

      switch (format) {
        case "excel":
          exportToExcel(exportData, fileName);
          toast.success("Data exported to Excel successfully!");
          break;
        case "csv":
          exportToCSV(exportData, fileName);
          toast.success("Data exported to CSV successfully!");
          break;
        case "json":
          exportToJSON(exportData, fileName);
          toast.success("Data exported to JSON successfully!");
          break;
      }
    } catch (error) {
      toast.error("Failed to export data. Please try again.");
      console.error("Export error:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          <span>Excel (.xlsx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-4 w-4 mr-2 text-blue-600" />
          <span>CSV (.csv)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2 text-orange-600" />
          <span>JSON (.json)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
