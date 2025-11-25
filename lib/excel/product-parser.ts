import ExcelJS from "exceljs";
import { ParsedProduct } from "@/types/import";
import { getEnabledProductFields } from "./product-template-config";

/**
 * Normalize a header string for comparison
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\s-]/g, "") // Remove underscores, spaces, and hyphens
    .trim();
}

/**
 * Find a matching expected header for a user-provided header
 */
function findHeaderMatch(
  userHeader: string,
  expectedHeaders: string[]
): string | undefined {
  const normalizedUser = normalizeHeader(userHeader);
  
  // Try to find a match by normalizing both headers
  return expectedHeaders.find(
    (expected) => normalizeHeader(expected) === normalizedUser
  );
}

/**
 * Create a mapping from user headers to expected headers
 */
function createHeaderMapping(
  userHeaders: string[],
  expectedHeaders: string[]
): Map<string, string> {
  const mapping = new Map<string, string>();
  
  userHeaders.forEach((userHeader) => {
    if (userHeader) {
      const match = findHeaderMatch(userHeader, expectedHeaders);
      if (match) {
        mapping.set(userHeader, match);
      }
    }
  });
  
  return mapping;
}

/**
 * Parse products from an Excel file
 */
export async function parseProductsExcel(
  fileBuffer: Buffer,
  brandId: string
): Promise<{ products: ParsedProduct[]; errors: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  // Get the first worksheet
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No worksheet found in the Excel file");
  }

  // Get headers from the first row
  const headerRow = worksheet.getRow(1);
  const userHeaders: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    userHeaders[colNumber - 1] = String(cell.value || "").trim();
  });

  // Get expected headers from configuration
  const enabledFields = getEnabledProductFields();
  const expectedHeaders = enabledFields.map((f) => f.header);
  const requiredHeaders = enabledFields
    .filter((f) => f.isRequired)
    .map((f) => f.header);

  // Create mapping from user headers to expected headers
  const headerMapping = createHeaderMapping(userHeaders, expectedHeaders);

  // Check for missing required headers
  const missingRequired: string[] = [];
  requiredHeaders.forEach((required) => {
    const hasMatch = Array.from(headerMapping.values()).includes(required);
    if (!hasMatch) {
      missingRequired.push(required);
    }
  });

  if (missingRequired.length > 0) {
    const foundHeadersList = userHeaders.filter(h => h).join(", ");
    const expectedHeadersList = expectedHeaders.join(", ");
    const errorMessage = [
      `Missing required columns: ${missingRequired.join(", ")}`,
      ``,
      `Found headers in your file: ${foundHeadersList}`,
      ``,
      `Expected headers: ${expectedHeadersList}`,
      ``,
      `Please download the template from the import page to ensure correct column headers.`
    ].join("\n");
    
    throw new Error(errorMessage);
  }

  console.log("[Product Parser] Header mapping created:", {
    userHeaders: userHeaders.filter(h => h),
    mappedHeaders: Array.from(headerMapping.entries()),
  });

  // Parse rows into products
  const products: ParsedProduct[] = [];
  const errors: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData: any = { row: rowNumber };
    
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const userHeader = userHeaders[colNumber - 1];
      if (userHeader) {
        // Map user header to expected header
        const expectedHeader = headerMapping.get(userHeader);
        if (expectedHeader) {
          rowData[expectedHeader] = getCellValue(cell);
        }
      }
    });

    // Only process rows with data
    if (hasData(rowData, Array.from(headerMapping.values()))) {
      const sku = String(rowData["SKU"] || "").trim();
      const productName = String(rowData["Product Name"] || "").trim();
      const unitPrice = parseNumber(rowData["Unit Price"]);

      // Track why rows are skipped
      const rowErrors: string[] = [];
      
      if (!sku) {
        rowErrors.push("SKU is empty");
      }
      if (!productName) {
        rowErrors.push("Product Name is empty");
      }
      if (unitPrice === undefined) {
        rowErrors.push(`Unit Price is invalid or empty (value: "${rowData["Unit Price"]}")`);
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`);
        console.log(`[Product Parser] Skipping row ${rowNumber}:`, {
          sku,
          productName,
          unitPrice,
          rawUnitPrice: rowData["Unit Price"],
          errors: rowErrors,
        });
      } else {
        const product: ParsedProduct = {
          row: rowNumber,
          sku,
          product_name: productName,
          description: rowData["Description"] || undefined,
          product_category: rowData["Category"] || undefined,
          unit_price: unitPrice!,
          cost_price: parseNumber(rowData["Cost Price"]),
          currency: rowData["Currency"] || "USD",
          quantity_in_stock: parseNumber(rowData["Quantity in Stock"]) || 0,
          reorder_level: parseNumber(rowData["Reorder Level"]) || 0,
          reorder_quantity: parseNumber(rowData["Reorder Quantity"]) || 0,
          barcode: rowData["Barcode"] || undefined,
          product_image_url: rowData["Image URL"] || undefined,
          weight: parseNumber(rowData["Weight"]),
          weight_unit: rowData["Weight Unit"] || "kg",
          status: parseStatus(rowData["Status"]),
          tags: parseTags(rowData["Tags"]),
          supplier_sku: rowData["Supplier SKU"] || undefined,
          notes: rowData["Notes"] || undefined,
          brand_id: brandId,
        };

        products.push(product);
        console.log(`[Product Parser] Added product from row ${rowNumber}:`, {
          sku,
          productName,
          unitPrice,
        });
      }
    } else {
      // Row has no data at all
      console.log(`[Product Parser] Row ${rowNumber} has no data, skipping`);
    }
  });

  console.log(`[Product Parser] Parsing complete:`, {
    totalProducts: products.length,
    totalErrors: errors.length,
  });

  return { products, errors };
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

  // If string, remove currency symbols and thousand separators
  if (typeof value === "string") {
    // Remove currency symbols
    let cleaned = value.replace(/[$€£¥]/g, "").trim();
    
    // Remove spaces (thousand separators in some locales)
    cleaned = cleaned.replace(/\s/g, "");
    
    // Remove commas ONLY if they appear to be thousand separators
    // (i.e., if there's a period after them, or if they appear multiple times)
    // This preserves European decimal commas in simple cases like "2,99"
    if (cleaned.includes(".")) {
      // If there's a period, commas are thousand separators
      cleaned = cleaned.replace(/,/g, "");
    } else if ((cleaned.match(/,/g) || []).length > 1) {
      // Multiple commas suggest thousand separators
      cleaned = cleaned.replace(/,/g, "");
    }
    // Otherwise leave comma alone (might be decimal separator)
    
    // Replace comma with period for decimal parsing (European format)
    cleaned = cleaned.replace(",", ".");
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  return undefined;
}

/**
 * Parse status field
 */
function parseStatus(value: any): "active" | "inactive" | "discontinued" | "out_of_stock" {
  if (!value) return "active";
  
  const str = String(value).toLowerCase().trim();
  
  if (str === "inactive") return "inactive";
  if (str === "discontinued") return "discontinued";
  if (str === "out_of_stock" || str === "out of stock") return "out_of_stock";
  
  return "active";
}

/**
 * Parse tags from string or array
 */
function parseTags(value: any): string[] | undefined {
  if (!value) return undefined;
  
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  
  if (typeof value === "string") {
    // Split by comma, semicolon, or pipe
    return value.split(/[,;|]/).map(tag => tag.trim()).filter(Boolean);
  }
  
  return undefined;
}

/**
 * Get file statistics
 */
export function getProductFileStats(fileBuffer: Buffer): {
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

