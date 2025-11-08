import ExcelJS from "exceljs";
import { ParsedOrder, ParsedOrderItem } from "@/types/import";
import { getEnabledFields, getFieldConfig } from "./template-config";

/**
 * Parse orders from an Excel file
 */
export async function parseOrdersExcel(fileBuffer: Buffer): Promise<ParsedOrder[]> {
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
    }
  });

  // Group rows by order (same order_date + customer_name = same order)
  for (const rowData of rows) {
    const orderDate = parseDate(rowData["Order Date"]);
    const customerName = String(rowData["Customer Name"] || "").trim();
    
    if (!orderDate || !customerName) {
      continue; // Skip invalid rows (will be caught in validation)
    }

    // Create unique key for the order
    const orderKey = `${orderDate}_${customerName}`;

    // Get or create order
    let order = ordersMap.get(orderKey);
    
    if (!order) {
      order = {
        row: rowData.row,
        order_date: orderDate,
        customer_name: customerName,
        customer_email: rowData["Customer Email"] || undefined,
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
        distributor_id: rowData["Distributor ID"] || undefined,
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

  return Array.from(ordersMap.values());
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
    const date = ExcelJS.Workbook.excelDateToJSDate(value);
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

