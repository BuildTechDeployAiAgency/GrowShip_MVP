import ExcelJS from "exceljs";
import { getEnabledProductFields } from "./product-template-config";

interface ProductTemplateOptions {
  brandId: string;
  includeInstructions?: boolean;
  includeSampleData?: boolean;
}

/**
 * Generate Excel template for product imports
 */
export async function generateProductTemplate(
  options: ProductTemplateOptions
): Promise<Buffer> {
  const { includeInstructions = true, includeSampleData = true } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");

  // Get enabled fields from configuration
  const fields = getEnabledProductFields();

  // Add headers
  const headerRow = worksheet.getRow(1);
  fields.forEach((field, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = field.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Set column width
    worksheet.getColumn(index + 1).width = field.width || 15;

    // Add data validation for specific fields
    if (field.validation?.options) {
      worksheet.getColumn(index + 1).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 1) { // Skip header
          cell.dataValidation = {
            type: "list",
            allowBlank: !field.isRequired,
            formulae: [`"${field.validation!.options!.join(",")}"`],
            showErrorMessage: true,
            errorTitle: "Invalid Value",
            error: `Please select from: ${field.validation!.options!.join(", ")}`,
          };
        }
      });
    }
  });

  // Add sample data if requested
  if (includeSampleData) {
    const sampleProducts = [
      {
        SKU: "PROD-001",
        "Product Name": "Premium Widget",
        Description: "High-quality premium widget",
        Category: "Widgets",
        "Unit Price": 99.99,
        "Cost Price": 49.99,
        Currency: "USD",
        "Quantity in Stock": 100,
        "Reorder Level": 20,
        "Reorder Quantity": 50,
        Barcode: "123456789012",
        "Image URL": "https://example.com/product.jpg",
        Weight: 2.5,
        "Weight Unit": "kg",
        Status: "active",
        Tags: "premium, bestseller",
        "Supplier SKU": "SUP-WIDGET-001",
        Notes: "High demand product",
      },
      {
        SKU: "PROD-002",
        "Product Name": "Standard Gadget",
        Description: "Reliable standard gadget",
        Category: "Gadgets",
        "Unit Price": 49.99,
        "Cost Price": 24.99,
        Currency: "USD",
        "Quantity in Stock": 250,
        "Reorder Level": 50,
        "Reorder Quantity": 100,
        Barcode: "234567890123",
        "Image URL": "https://example.com/gadget.jpg",
        Weight: 1.2,
        "Weight Unit": "kg",
        Status: "active",
        Tags: "standard, reliable",
        "Supplier SKU": "SUP-GADGET-001",
        Notes: "Steady seller",
      },
    ];

    sampleProducts.forEach((product, index) => {
      const row = worksheet.getRow(index + 2);
      fields.forEach((field, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = (product as any)[field.header] || "";
        
        // Apply number format for numeric fields
        if (field.dataType === "number") {
          if (field.name.includes("price") || field.name.includes("cost")) {
            cell.numFmt = "#,##0.00";
          } else {
            cell.numFmt = "#,##0";
          }
        }
      });
    });
  }

  // Add instructions sheet if requested
  if (includeInstructions) {
    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.getColumn(1).width = 80;

    const instructions = [
      { text: "Product Import Instructions", style: "title" },
      { text: "", style: "normal" },
      { text: "Required Fields:", style: "heading" },
      { text: "• SKU: Unique product identifier (required)", style: "normal" },
      { text: "• Product Name: Full name of the product (required)", style: "normal" },
      { text: "• Unit Price: Selling price per unit (required)", style: "normal" },
      { text: "", style: "normal" },
      { text: "Optional Fields:", style: "heading" },
      { text: "• Description: Detailed product description", style: "normal" },
      { text: "• Category: Product category for organization", style: "normal" },
      { text: "• Cost Price: Your cost per unit", style: "normal" },
      { text: "• Currency: Currency code (default: USD)", style: "normal" },
      { text: "• Quantity in Stock: Current inventory level", style: "normal" },
      { text: "• Reorder Level: Inventory level that triggers reorder", style: "normal" },
      { text: "• Reorder Quantity: Amount to reorder when triggered", style: "normal" },
      { text: "• Barcode: Product barcode/UPC", style: "normal" },
      { text: "• Image URL: Link to product image", style: "normal" },
      { text: "• Weight: Product weight", style: "normal" },
      { text: "• Weight Unit: kg, g, lb, or oz (default: kg)", style: "normal" },
      { text: "• Status: active, inactive, discontinued, or out_of_stock (default: active)", style: "normal" },
      { text: "• Tags: Comma-separated tags for organization", style: "normal" },
      { text: "• Supplier SKU: Supplier's product reference", style: "normal" },
      { text: "• Notes: Additional information", style: "normal" },
      { text: "", style: "normal" },
      { text: "Important Notes:", style: "heading" },
      { text: "• SKU must be unique across all products for your brand", style: "normal" },
      { text: "• If a product with the same SKU exists, it will be updated", style: "normal" },
      { text: "• All prices must be 0 or greater", style: "normal" },
      { text: "• Status values: active, inactive, discontinued, out_of_stock", style: "normal" },
      { text: "• Currency codes: USD, EUR, GBP, CAD, AUD, JPY, CNY", style: "normal" },
      { text: "• Weight units: kg, g, lb, oz", style: "normal" },
      { text: "• Maximum file size: 10MB", style: "normal" },
      { text: "", style: "normal" },
      { text: "Steps:", style: "heading" },
      { text: "1. Fill in product data in the 'Products' sheet", style: "normal" },
      { text: "2. Ensure all required fields are completed", style: "normal" },
      { text: "3. Save the file", style: "normal" },
      { text: "4. Upload the file through the import interface", style: "normal" },
      { text: "5. Review validation results", style: "normal" },
      { text: "6. Confirm import to add products to your catalog", style: "normal" },
    ];

    instructions.forEach((instruction, index) => {
      const row = instructionsSheet.getRow(index + 1);
      const cell = row.getCell(1);
      cell.value = instruction.text;

      if (instruction.style === "title") {
        cell.font = { size: 16, bold: true, color: { argb: "FF4472C4" } };
        row.height = 25;
      } else if (instruction.style === "heading") {
        cell.font = { size: 12, bold: true, color: { argb: "FF203864" } };
        row.height = 20;
      } else {
        cell.font = { size: 11 };
        row.height = 18;
      }

      cell.alignment = { vertical: "middle", wrapText: true };
    });
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Get product template filename
 */
export function getProductTemplateFilename(): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `product-import-template-${timestamp}.xlsx`;
}

