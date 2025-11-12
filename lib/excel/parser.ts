import ExcelJS from "exceljs";
import { ParsedOrder, ParsedOrderItem } from "@/types/import";
import { getEnabledFields, getFieldConfig } from "./template-config";

/**
 * Auto-population data for orders
 */
export interface AutoPopulationData {
  brandId: string;
  distributorId?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * Parse orders from an Excel file
 * Returns orders and extracted distributor_id
 */
export async function parseOrdersExcel(
  fileBuffer: Buffer,
  autoPopulate?: AutoPopulationData
): Promise<{
  orders: ParsedOrder[];
  extractedDistributorId?: string;
  distributorIdConsistent: boolean;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  // Get the first worksheet (assuming orders are in the first sheet)
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
  const enabledFields = getEnabledFields();
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

  // Parse rows into orders
  const ordersMap = new Map<string, ParsedOrder>();
  const rows: any[] = [];
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
      rows.push(rowData);
      
      // Collect distributor IDs from rows
      const distributorId = String(rowData["Distributor ID"] || "").trim();
      if (distributorId) {
        distributorIds.add(distributorId);
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
  // If distributorIds.size === 0 and no autoPopulate.distributorId, will be caught in validation

  // Group rows by order (same order_date + customer_name = same order)
  for (const rowData of rows) {
    const orderDate = parseDate(rowData["Order Date"]);
    // Auto-populate customer_name if empty
    const customerName = String(rowData["Customer Name"] || "").trim() || autoPopulate?.customerName || "";
    
    if (!orderDate) {
      continue; // Skip invalid rows (will be caught in validation)
    }
    
    // If customer_name is still empty after auto-population, skip (will be caught in validation)
    if (!customerName) {
      continue;
    }

    // Create unique key for the order
    const orderKey = `${orderDate}_${customerName}`;

    // Get or create order
    let order = ordersMap.get(orderKey);
    
    if (!order) {
      // Auto-populate distributor_id if empty
      const distributorId = extractedDistributorId || 
                          String(rowData["Distributor ID"] || "").trim() || 
                          autoPopulate?.distributorId || 
                          undefined;
      
      // Auto-populate customer_email if empty
      const customerEmail = parseEmail(rowData["Customer Email"]) || autoPopulate?.customerEmail || undefined;
      
      order = {
        row: rowData.row,
        order_date: orderDate,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: rowData["Customer Phone"] || undefined,
        customer_type: rowData["Customer Type"] || undefined,
        items: [],
        shipping_address_line1: rowData["Shipping Address Line 1"] || undefined,
        shipping_address_line2: rowData["Shipping Address Line 2"] || undefined,
        shipping_city: rowData["Shipping City"] || undefined,
        shipping_state: rowData["Shipping State/Province"] || undefined,
        shipping_zip_code: rowData["Shipping Zip/Postal Code"] || undefined,
        shipping_country: rowData["Shipping Country"] || undefined,
        shipping_method: rowData["Shipping Method"] || undefined,
        shipping_cost: parseNumber(rowData["Shipping Cost"]),
        discount_total: parseNumber(rowData["Discount %"]),
        tax_total: parseNumber(rowData["Tax Rate %"]),
        notes: rowData["Notes"] || undefined,
        payment_method: rowData["Payment Method"] || undefined,
        payment_status: rowData["Payment Status"] || undefined,
        distributor_id: distributorId,
      };
      ordersMap.set(orderKey, order);
    }

    // Add item to order
    const sku = String(rowData["SKU"] || "").trim();
    const quantity = parseNumber(rowData["Quantity"]);
    const unitPrice = parseNumber(rowData["Unit Price"]);

    if (sku && quantity !== undefined && unitPrice !== undefined) {
      const item: ParsedOrderItem = {
        sku,
        product_name: rowData["Product Name"] || undefined,
        quantity,
        unit_price: unitPrice,
        discount: parseNumber(rowData["Discount %"]),
        tax_rate: parseNumber(rowData["Tax Rate %"]),
      };

      // Calculate item total
      let total = quantity * unitPrice;
      if (item.discount && item.discount > 0) {
        total = total * (1 - item.discount / 100);
      }
      if (item.tax_rate && item.tax_rate > 0) {
        total = total * (1 + item.tax_rate / 100);
      }
      item.total = Math.round(total * 100) / 100;

      order.items.push(item);
    }
  }

  return {
    orders: Array.from(ordersMap.values()),
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

  // Handle hyperlinks (ExcelJS represents hyperlinks as objects with text property)
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
 * Excel epoch: January 1, 1900 (day 1)
 * JavaScript epoch: January 1, 1970
 * 
 * Excel incorrectly treats 1900 as a leap year, so we account for that.
 * Excel day 1 = January 1, 1900
 * Excel day 60 = February 29, 1900 (which doesn't exist, but Excel counts it)
 */
function excelSerialToJSDate(serial: number): Date {
  // Excel serial date: days since 1900-01-01 (day 1)
  // JavaScript Date: milliseconds since 1970-01-01
  
  // Days between 1900-01-01 and 1970-01-01 = 25569
  // But Excel incorrectly counts 1900 as a leap year, so we adjust
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400; // Convert to seconds
  
  // Create base date from UTC
  const dateInfo = new Date(utcValue * 1000);
  
  // Handle fractional day (time component)
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  
  // Create final date with time component
  // Use UTC methods to avoid timezone issues
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
 * Safely convert a value to a string for email fields
 * Handles Date objects, other objects, and edge cases
 */
function parseEmail(value: any): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  // If already a string, trim it
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  // If it's a Date object, it's likely a mistake (email shouldn't be a date)
  // Return undefined to let validation catch it
  if (value instanceof Date) {
    return undefined;
  }

  // If it's an object, try to extract meaningful string value
  if (typeof value === "object") {
    // Handle ExcelJS hyperlink objects: { text: "...", hyperlink: "..." }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim() || undefined;
    }
    
    // Handle ExcelJS rich text objects: { richText: [...] }
    if ("richText" in value && Array.isArray(value.richText)) {
      const text = value.richText.map((t: any) => t.text || "").join("");
      return text.trim() || undefined;
    }
    
    // Handle formula result objects: { result: ... }
    if ("result" in value) {
      return parseEmail(value.result);
    }
    
    // Check if it has a toString method that's not the default Object.toString
    if (value.toString && typeof value.toString === "function") {
      const str = value.toString();
      if (str !== "[object Object]") {
        return str.trim() || undefined;
      }
    }
    
    // Last resort: return undefined for objects we can't convert
    return undefined;
  }

  // For other types (number, boolean, etc.), convert to string
  return String(value).trim() || undefined;
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
    const cleaned = value.replace(/[$,]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  return undefined;
}

/**
 * Get file statistics
 */
export function getFileStats(fileBuffer: Buffer): {
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

