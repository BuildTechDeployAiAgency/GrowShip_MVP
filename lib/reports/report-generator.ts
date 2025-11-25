import ExcelJS from "exceljs";

export type ReportType = "fulfillment" | "delivery" | "sku_performance";

export interface ReportData {
  type: ReportType;
  title: string;
  period?: {
    start: string;
    end: string;
  };
  data: any[];
  columns: Array<{
    header: string;
    key: string;
    width?: number;
    format?: string;
  }>;
}

/**
 * Generate Excel report from data
 */
export async function generateExcelReport(reportData: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = "GrowShip";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create worksheet
  const worksheet = workbook.addWorksheet(reportData.title, {
    properties: { tabColor: { argb: "FF0D9488" } },
  });

  // Set up headers
  const headerRow = worksheet.getRow(1);
  reportData.columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    
    // Style the header
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D9488" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Set column width
    worksheet.getColumn(index + 1).width = col.width || 15;
  });

  headerRow.height = 20;

  // Add data rows
  reportData.data.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(rowIndex + 2);
    reportData.columns.forEach((col, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      const value = row[col.key];

      if (col.format === "currency") {
        cell.value = typeof value === "number" ? value : parseFloat(value) || 0;
        cell.numFmt = '$#,##0.00';
      } else if (col.format === "number") {
        cell.value = typeof value === "number" ? value : parseFloat(value) || 0;
        cell.numFmt = '#,##0';
      } else if (col.format === "percentage") {
        cell.value = typeof value === "number" ? value : parseFloat(value) || 0;
        cell.numFmt = '0.00%';
      } else if (col.format === "date") {
        cell.value = value ? new Date(value) : null;
        cell.numFmt = 'mm/dd/yyyy';
      } else {
        cell.value = value ?? "";
      }

      cell.alignment = { vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  // Add summary row if applicable
  if (reportData.data.length > 0) {
    const summaryRow = worksheet.getRow(reportData.data.length + 3);
    summaryRow.font = { bold: true };
    
    // Add totals for numeric columns
    reportData.columns.forEach((col, colIndex) => {
      if (col.format === "currency" || col.format === "number") {
        const cell = summaryRow.getCell(colIndex + 1);
        const startRow = 2;
        const endRow = reportData.data.length + 1;
        (cell as any).formula = `SUM(${worksheet.getCell(startRow, colIndex + 1).address}:${worksheet.getCell(endRow, colIndex + 1).address})`;
        cell.font = { bold: true };
        if (col.format === "currency") {
          cell.numFmt = '$#,##0.00';
        } else {
          cell.numFmt = '#,##0';
        }
      }
    });
  }

  // Freeze header row
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Get filename for report
 */
export function getReportFilename(type: ReportType, date?: string): string {
  const dateStr = date || new Date().toISOString().split("T")[0];
  const typeMap: Record<ReportType, string> = {
    fulfillment: "fulfillment",
    delivery: "delivery_performance",
    sku_performance: "sku_performance",
  };
  return `${typeMap[type]}_report_${dateStr}.xlsx`;
}

