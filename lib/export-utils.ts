/**
 * Utility functions for exporting data in various formats
 */

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface ExportData {
  [key: string]: any;
}

/**
 * Export data to Excel format
 */
export async function exportToExcel(data: ExportData[], fileName: string = "export") {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Add headers
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
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
      data.forEach((row) => {
        worksheet.addRow(headers.map((header) => row[header] ?? ""));
      });

      // Auto-size columns
      worksheet.columns.forEach((column) => {
        let maxLength = 10;
        column?.eachCell?.({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value?.toString() || "";
          maxLength = Math.max(maxLength, cellValue.length);
        });
        column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
      });
    }

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export data to Excel");
  }
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(data: ExportData[], fileName: string = "export") {
  try {
    if (data.length === 0) {
      throw new Error("No data to export");
    }

    const headers = Object.keys(data[0]);
    
    // Convert to CSV manually
    const csvContent = data.map((row) =>
      headers.map((header) => {
        const value = row[header] ?? "";
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(",")
    ).join("\n");
    
    const csvWithHeaders = [headers.join(","), csvContent].join("\n");
    const blob = new Blob([csvWithHeaders], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${fileName}_${new Date().toISOString().split("T")[0]}.csv`);
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    throw new Error("Failed to export data to CSV");
  }
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: ExportData[], fileName: string = "export") {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${fileName}_${new Date().toISOString().split("T")[0]}.json`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting to JSON:", error);
    throw new Error("Failed to export data to JSON");
  }
}

/**
 * Generate sample sales data for export
 */
export function generateSampleSalesData() {
  return [
    {
      Date: "2024-10-01",
      SKU: "PRD-2024-001",
      "Product Name": "Wireless Bluetooth Headphones Pro",
      Category: "Electronics",
      Retailer: "Walmart",
      Territory: "North America",
      Revenue: 50000,
      Volume: 1000,
      Target: 45000,
      "Profit Margin": "24.5%",
    },
    {
      Date: "2024-10-01",
      SKU: "PRD-2024-015",
      "Product Name": "Smart Home Security Camera",
      Category: "Electronics",
      Retailer: "Target",
      Territory: "North America",
      Revenue: 42000,
      Volume: 850,
      Target: 40000,
      "Profit Margin": "26.2%",
    },
    {
      Date: "2024-10-01",
      SKU: "PRD-2024-032",
      "Product Name": "Organic Cotton T-Shirt Bundle",
      Category: "Apparel",
      Retailer: "Amazon",
      Territory: "Europe",
      Revenue: 35000,
      Volume: 1200,
      Target: 32000,
      "Profit Margin": "22.8%",
    },
  ];
}
