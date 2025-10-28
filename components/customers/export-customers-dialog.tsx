"use client";

import { useState } from "react";
import { Download, FileText, Table, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { UserProfile } from "@/types/auth";
import { toast } from "react-toastify";

interface ExportCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: UserProfile[];
  totalCount: number;
}

export function ExportCustomersDialog({
  open,
  onOpenChange,
  customers,
  totalCount,
}: ExportCustomersDialogProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [includeFields, setIncludeFields] = useState({
    contactInfo: true,
    companyInfo: true,
    status: true,
    dates: true,
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);

      // Filter data based on selected fields
      const exportData = customers.map((customer) => {
        const data: any = {};

        if (includeFields.contactInfo) {
          data.contact_name = customer.contact_name;
          data.email = customer.email;
          data.phone = customer.phone || "";
        }

        if (includeFields.companyInfo) {
          data.company_name = customer.company_name;
          data.city = customer.city || "";
          data.state = customer.state || "";
          data.country = customer.country || "";
          data.website = customer.website || "";
        }

        if (includeFields.status) {
          data.status = customer.user_status;
        }

        if (includeFields.dates) {
          data.created_at = new Date(customer.created_at).toLocaleDateString();
          data.updated_at = new Date(customer.updated_at).toLocaleDateString();
        }

        return data;
      });

      // Generate file based on format
      let blob: Blob;
      let filename: string;

      if (format === "csv") {
        // Convert to CSV
        if (exportData.length === 0) {
          toast.warning("No data to export");
          return;
        }

        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(","),
          ...exportData.map((row) =>
            headers.map((header) => `"${row[header] || ""}"`).join(",")
          ),
        ].join("\n");

        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        filename = `customers-export-${new Date().toISOString().split("T")[0]}.csv`;
      } else {
        // Convert to JSON
        blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        filename = `customers-export-${new Date().toISOString().split("T")[0]}.json`;
      }

      // Download file
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `Successfully exported ${exportData.length} customer${exportData.length !== 1 ? "s" : ""} to ${format.toUpperCase()}`,
        {
          position: "top-right",
          autoClose: 3000,
        }
      );

      onOpenChange(false);
    } catch (error) {
      console.error("Error exporting customers:", error);
      toast.error("Failed to export customers. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const toggleField = (field: keyof typeof includeFields) => {
    setIncludeFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Export Customers
          </DialogTitle>
          <DialogDescription>
            Export {totalCount} customer{totalCount !== 1 ? "s" : ""} to a file.
            Choose your preferred format and fields to include.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <RadioGroup value={format} onValueChange={(value: any) => setFormat(value)}>
              <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="csv" id="csv" />
                <Label
                  htmlFor="csv"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <Table className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">CSV File</div>
                    <div className="text-xs text-gray-500">
                      Compatible with Excel and spreadsheet applications
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="json" id="json" />
                <Label
                  htmlFor="json"
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">JSON File</div>
                    <div className="text-xs text-gray-500">
                      Structured format for developers and APIs
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Include Fields</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contactInfo"
                  checked={includeFields.contactInfo}
                  onCheckedChange={() => toggleField("contactInfo")}
                />
                <Label
                  htmlFor="contactInfo"
                  className="text-sm font-normal cursor-pointer"
                >
                  Contact Information (Name, Email, Phone)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="companyInfo"
                  checked={includeFields.companyInfo}
                  onCheckedChange={() => toggleField("companyInfo")}
                />
                <Label
                  htmlFor="companyInfo"
                  className="text-sm font-normal cursor-pointer"
                >
                  Company Details (Company, Location, Website)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="status"
                  checked={includeFields.status}
                  onCheckedChange={() => toggleField("status")}
                />
                <Label
                  htmlFor="status"
                  className="text-sm font-normal cursor-pointer"
                >
                  Status Information
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dates"
                  checked={includeFields.dates}
                  onCheckedChange={() => toggleField("dates")}
                />
                <Label
                  htmlFor="dates"
                  className="text-sm font-normal cursor-pointer"
                >
                  Dates (Created, Updated)
                </Label>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The export will include all {customers.length}{" "}
              customer{customers.length !== 1 ? "s" : ""} currently displayed based
              on your active filters.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={
              exporting ||
              !Object.values(includeFields).some((v) => v) ||
              customers.length === 0
            }
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

