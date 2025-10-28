/**
 * Utility functions for exporting data in various formats
 */

import * as XLSX from "xlsx";

interface ExportData {
  [key: string]: any;
}

/**
 * Export data to Excel format
 */
export function exportToExcel(data: ExportData[], fileName: string = "export") {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // Auto-size columns
    const maxWidth = data.reduce(
      (w, r) => Math.max(w, JSON.stringify(r).length),
      10
    );
    worksheet["!cols"] = Object.keys(data[0] || {}).map(() => ({
      wch: maxWidth,
    }));

    XLSX.writeFile(
      workbook,
      `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export data to Excel");
  }
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: ExportData[], fileName: string = "export") {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${fileName}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
