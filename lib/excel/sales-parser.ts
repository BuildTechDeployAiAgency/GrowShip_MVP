import ExcelJS from "exceljs";
import { ParsedSalesRow } from "@/types/import";
import { getEnabledSalesFields, getSalesFieldConfig } from "./sales-template-config";

/**
 * Auto-population data for sales import
 */
export interface SalesAutoPopulationData {
  brandId: string;
  distributorId?: string;
}

/**
 * Parse sales data from an Excel file
 * Returns sales rows and extracted distributor_id
 */
export async function parseSalesExcel(
  fileBuffer: Buffer,
  autoPopulate?: SalesAutoPopulationData
): Promise<{
  salesRows: ParsedSalesRow[];
  extractedDistributorId?: string;
  distributorIdConsistent: boolean;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  // Get the first worksheet (assuming sales data is in the first sheet)
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No worksheet found in the Excel file");
  }

  // Get headers from the first row
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || "").trim();
  });

  // Validate that we have required headers
  const enabledFields = getEnabledSalesFields();
  const requiredHeaders = enabledFields
    .filter((f) => f.isRequired)
    .map((f) => f.header);

  const missingHeaders = requiredHeaders.filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(", ")}`
    );
  }

  // Parse rows into sales data
  const salesRows: ParsedSalesRow[] = [];
  const distributorIds = new Set<string>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData: any = { row: rowNumber };
    
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = getCellValue(cell);
      }
    });

    // Only process rows with data
    if (hasData(rowData, headers)) {
      // Collect distributor IDs from rows
      const distributorId = String(rowData["Distributor ID"] || "").trim();
      if (distributorId) {
        distributorIds.add(distributorId);
      }

      // Parse the sales row
      const salesDate = parseDate(rowData["Sales Date"]);
      const sku = String(rowData["SKU"] || "").trim();
      const retailerName = String(rowData["Retailer"] || "").trim();
      const territory = String(rowData["Territory/Region"] || "").trim();
      const unitsSold = parseNumber(rowData["Units Sold"]);
      const totalSales = parseNumber(rowData["Net Revenue"]);

      if (salesDate && sku && retailerName && territory && unitsSold !== undefined && totalSales !== undefined) {
        // Calculate reporting_month (first day of month)
        const reportingMonth = normalizeToFirstDayOfMonth(salesDate);

        const salesRow: ParsedSalesRow = {
          row: rowNumber,
          sales_date: salesDate,
          reporting_month: reportingMonth,
          sku,
          product_name: rowData["Product Name"] || undefined,
          category: rowData["Category"] || undefined,
          retailer_name: retailerName,
          territory,
          territory_country: rowData["Country"] || undefined,
          sales_channel: rowData["Sales Channel"] || undefined,
          units_sold: unitsSold,
          total_sales: totalSales,
          gross_revenue_local: parseNumber(rowData["Gross Revenue Local"]),
          marketing_spend: parseNumber(rowData["Marketing Spend"]),
          currency: rowData["Currency"] || "USD",
          target_revenue: parseNumber(rowData["Target Revenue"]),
          notes: rowData["Notes"] || undefined,
          distributor_id: distributorId || autoPopulate?.distributorId || undefined,
        };

        salesRows.push(salesRow);
      }
    }
  });

  // Extract and validate distributor ID
  let extractedDistributorId: string | undefined;
  let distributorIdConsistent = true;

  if (distributorIds.size > 1) {
    // Multiple different distributor IDs found
    distributorIdConsistent = false;
    throw new Error(
      `Multiple distributor IDs found in sheet: ${Array.from(distributorIds).join(", ")}. Only one distributor per upload is allowed.`
    );
  } else if (distributorIds.size === 1) {
    // Single distributor ID found
    extractedDistributorId = Array.from(distributorIds)[0];
  } else if (autoPopulate?.distributorId) {
    // No distributor ID in sheet, use auto-populated one
    extractedDistributorId = autoPopulate.distributorId;
  }

  return {
    salesRows,
    extractedDistributorId,
    distributorIdConsistent,
  };
}

/**
 * Get cell value handling different types
 */
function getCellValue(cell: ExcelJS.Cell): any {
  if (cell.value === null || cell.value === undefined) {
    return undefined;
  }

  // Handle rich text
  if (typeof cell.value === "object" && "richText" in cell.value) {
    return cell.value.richText.map((t: any) => t.text).join("");
  }

  // Handle formulas
  if (typeof cell.value === "object" && "result" in cell.value) {
    return cell.value.result;
  }

  // Handle hyperlinks
  if (typeof cell.value === "object" && "text" in cell.value && typeof cell.value.text === "string") {
    return cell.value.text;
  }

  // Handle dates
  if (cell.type === ExcelJS.ValueType.Date) {
    return cell.value;
  }

  return cell.value;
}

/**
 * Check if row has any data
 */
function hasData(rowData: any, headers: string[]): boolean {
  return headers.some((header) => {
    const value = rowData[header];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

/**
 * Convert Excel date serial number to JavaScript Date
 */
function excelSerialToJSDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const finalDate = new Date(Date.UTC(
    dateInfo.getUTCFullYear(),
    dateInfo.getUTCMonth(),
    dateInfo.getUTCDate(),
    hours,
    minutes,
    seconds
  ));
  return finalDate;
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): string | undefined {
  if (!value) return undefined;

  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  // If it's a string, try to parse it
  if (typeof value === "string") {
    const str = value.trim();
    
    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.split("T")[0];
    }

    // Try parsing with Date constructor
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // If it's a number (Excel date serial)
  if (typeof value === "number") {
    const date = excelSerialToJSDate(value);
    return date.toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Parse number from various formats
 */
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  // If already a number
  if (typeof value === "number") {
    return value;
  }

  // If string, remove currency symbols and commas
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,€£¥]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  return undefined;
}

/**
 * Normalize date to first day of month for reporting
 */
function normalizeToFirstDayOfMonth(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Get file statistics
 */
export function getSalesFileStats(fileBuffer: Buffer): {
  size: number;
  sizeKB: number;
  sizeMB: number;
} {
  const size = fileBuffer.length;
  return {
    size,
    sizeKB: Math.round(size / 1024),
    sizeMB: Math.round((size / 1024 / 1024) * 100) / 100,
  };
}

