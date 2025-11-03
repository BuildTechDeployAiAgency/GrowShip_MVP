"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, FileJson, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { UserProfile } from "@/types/auth";

interface ExportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserProfile[];
  totalCount: number;
}

export function ExportUsersDialog({
  open,
  onOpenChange,
  users,
  totalCount,
}: ExportUsersDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatUserData = (user: UserProfile) => ({
    "Full Name": user.contact_name,
    Email: user.email,
    Status:
      user.user_status.charAt(0).toUpperCase() + user.user_status.slice(1),
    Role: user.role_name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    Company: user.company_name || "N/A",
    Phone: user.phone || "N/A",
    Address: user.address || "N/A",
    City: user.city || "N/A",
    State: user.state || "N/A",
    Country: user.country || "N/A",
    "Created Date": new Date(user.created_at).toLocaleDateString(),
    "Last Updated": new Date(user.updated_at).toLocaleDateString(),
  });

  const exportToJSON = () => {
    setIsExporting(true);
    try {
      const formattedData = users.map(formatUserData);
      const jsonData = JSON.stringify(formattedData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      saveAs(
        blob,
        `users-export-${new Date().toISOString().split("T")[0]}.json`
      );
    } catch (error) {
      console.error("Error exporting to JSON:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToTXT = () => {
    setIsExporting(true);
    try {
      const formattedData = users.map(formatUserData);
      let txtContent = "USERS EXPORT\n";
      txtContent += "=".repeat(50) + "\n\n";

      formattedData.forEach((user, index) => {
        txtContent += `User ${index + 1}:\n`;
        Object.entries(user).forEach(([key, value]) => {
          txtContent += `  ${key}: ${value}\n`;
        });
        txtContent += "\n";
      });

      const blob = new Blob([txtContent], { type: "text/plain" });
      saveAs(
        blob,
        `users-export-${new Date().toISOString().split("T")[0]}.txt`
      );
    } catch (error) {
      console.error("Error exporting to TXT:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const formattedData = users.map(formatUserData);

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Users");

      // Add headers
      const headers = Object.keys(formattedData[0] || {});
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      formattedData.forEach((row) => {
        worksheet.addRow(headers.map((header) => row[header] ?? ""));
      });

      // Set column widths
      worksheet.columns = [
        { width: 20 }, // Full Name
        { width: 30 }, // Email
        { width: 12 }, // Status
        { width: 15 }, // Role
        { width: 20 }, // Company
        { width: 15 }, // Phone
        { width: 25 }, // Address
        { width: 15 }, // City
        { width: 10 }, // State
        { width: 15 }, // Country
        { width: 15 }, // Created Date
        { width: 15 }, // Last Updated
      ];

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `users-export-${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      id: "json",
      name: "JSON",
      description: "Export as JSON format for data processing",
      icon: FileJson,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      action: exportToJSON,
    },
    {
      id: "txt",
      name: "Text File",
      description: "Export as plain text for easy reading",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      action: exportToTXT,
    },
    {
      id: "excel",
      name: "Excel Spreadsheet",
      description: "Export as Excel file for analysis",
      icon: FileSpreadsheet,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      action: exportToExcel,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Users
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Choose export format for your users data
            </p>
            <Badge variant="outline" className="text-xs">
              {users.length} of {totalCount} users will be exported
            </Badge>
          </div>

          <div className="space-y-3">
            {exportOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card
                  key={option.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${option.borderColor} ${option.bgColor}`}
                  onClick={option.action}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${option.bgColor}`}>
                        <IconComponent className={`h-5 w-5 ${option.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {option.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {option.description}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
          </div>

          {isExporting && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Exporting...
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
