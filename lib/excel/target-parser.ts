import ExcelJS from "exceljs";
import { getEnabledTargetFields } from "./target-template-config";
import { ParsedTarget } from "@/types/import";

/**
 * Parse targets from an Excel file
 */
export async function parseTargetsExcel(
  fileBuffer: Buffer
): Promise<{
  targets: ParsedTarget[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  // Get the first worksheet
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
  const enabledFields = getEnabledTargetFields();
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

  // Parse rows into targets
  const targets: ParsedTarget[] = [];

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
      const sku = String(rowData["SKU"] || "").trim();
      const targetPeriod = parseDate(rowData["Target Period"]);
      const periodType = String(rowData["Period Type"] || "").trim().toLowerCase();
      const targetQuantity = parseNumber(rowData["Target Quantity"]);
      const targetRevenue = parseNumber(rowData["Target Revenue"]);

      if (sku && targetPeriod && periodType) {
        // Validate period type
        const validPeriodTypes = ["monthly", "quarterly", "yearly"];
        if (!validPeriodTypes.includes(periodType)) {
          // Skip invalid period types (will be caught in validation)
          return;
        }

        const target: ParsedTarget = {
          row: rowNumber,
          sku,
          target_period: targetPeriod,
          period_type: periodType as "monthly" | "quarterly" | "yearly",
          target_quantity: targetQuantity,
          target_revenue: targetRevenue,
        };

        targets.push(target);
      }
    }
  });

  return { targets };
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
 * Parse date from various formats
 */
function parseDate(value: any): string | null {
  if (!value) return null;

  // If already a Date object
  if (value instanceof Date) {
    return formatDate(value);
  }

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    // Excel epoch: January 1, 1900 (day 1)
    // Excel incorrectly treats 1900 as a leap year
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return formatDate(jsDate);
  }

  // If it's a string, try to parse it
  if (typeof value === "string") {
    const trimmed = value.trim();
    
    // Try ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed + "T00:00:00");
      if (!isNaN(date.getTime())) {
        return formatDate(date);
      }
    }

    // Try MM/DD/YYYY or DD/MM/YYYY
    const dateMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dateMatch) {
      const [, part1, part2, year] = dateMatch;
      // Assume MM/DD/YYYY format
      const month = parseInt(part1) - 1;
      const day = parseInt(part2);
      const date = new Date(parseInt(year), month, day);
      if (!isNaN(date.getTime())) {
        return formatDate(date);
      }
    }
  }

  return null;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse number from cell value
 */
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return isNaN(value) ? undefined : value;
  }

  if (typeof value === "string") {
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

