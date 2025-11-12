"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportButtonProps {
  reportType: "fulfillment" | "delivery" | "sku_performance";
  brandId?: string;
  startDate?: string;
  endDate?: string;
  sku?: string;
  className?: string;
}

export function ExportButton({
  reportType,
  brandId,
  startDate,
  endDate,
  sku,
  className,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (brandId) params.append("brand_id", brandId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (sku) params.append("sku", sku);

      const response = await fetch(`/api/reports/${reportType}/export?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export report");
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${reportType}_report.xlsx`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report exported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to export report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </>
      )}
    </Button>
  );
}

