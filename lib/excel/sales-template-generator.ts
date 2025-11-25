import ExcelJS from "exceljs";
import { getEnabledSalesFields, SALES_TEMPLATE_CONFIG } from "./sales-template-config";

export interface GenerateSalesTemplateOptions {
  brandId: string;
  distributorId?: string;
  includeInstructions?: boolean;
  includeSampleData?: boolean;
}

/**
 * Generate an Excel template for sales data imports
 */
export async function generateSalesTemplate(
  options: GenerateSalesTemplateOptions
): Promise<Buffer> {
  const {
    distributorId,
    includeInstructions = true,
    includeSampleData = true,
  } = options;

  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = "GrowShip";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create the main data sheet
  const dataSheet = workbook.addWorksheet("Sales Data", {
    properties: { tabColor: { argb: "FF10B981" } }, // Green color for sales
  });

  // Get enabled fields
  const fields = getEnabledSalesFields();

  // Set up headers
  const headerRow = dataSheet.getRow(1);
  fields.forEach((field, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = field.header;
    
    // Style the header based on required/optional
    cell.font = { 
      bold: true, 
      color: { argb: field.isRequired ? "FFFFFFFF" : "FF000000" } 
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: field.isRequired ? "FF10B981" : "FFD1FAE5" }, // Dark green for required, light green for optional
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Set column width
    dataSheet.getColumn(index + 1).width = field.width || 15;

    // Add data validation for certain fields
    if (field.validation?.options) {
      dataSheet.getColumn(index + 1).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
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

  headerRow.height = 20;
  headerRow.commit();

  // Add sample data if requested
  if (includeSampleData) {
    const sampleRow = dataSheet.getRow(2);
    fields.forEach((field, index) => {
      const cell = sampleRow.getCell(index + 1);
      
      // Use example value or generate sample
      if (field.name === "distributor_id" && distributorId) {
        cell.value = distributorId;
      } else {
        cell.value = field.example || "";
      }
      
      // Style sample row differently
      cell.font = { italic: true, color: { argb: "FF6B7280" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };
    });
    sampleRow.commit();
  }

  // Freeze the header row
  dataSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Create instructions sheet if requested
  if (includeInstructions) {
    const instructionsSheet = workbook.addWorksheet("Instructions", {
      properties: { tabColor: { argb: "FF3B82F6" } }, // Blue color for instructions
    });

    instructionsSheet.getColumn(1).width = 80;

    // Add title
    const titleCell = instructionsSheet.getCell("A1");
    titleCell.value = "Distributor Sales Report Import Template - Instructions";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF10B981" } };
    titleCell.alignment = { vertical: "middle" };
    instructionsSheet.getRow(1).height = 25;

    // Add instructions
    let currentRow = 3;
    SALES_TEMPLATE_CONFIG.instructions?.forEach((instruction) => {
      const cell = instructionsSheet.getCell(`A${currentRow}`);
      cell.value = instruction;
      cell.font = { size: 11 };
      cell.alignment = { wrapText: true, vertical: "top" };
      instructionsSheet.getRow(currentRow).height = 30;
      currentRow++;
    });

    currentRow += 2;

    // Add field descriptions
    const fieldsHeaderCell = instructionsSheet.getCell(`A${currentRow}`);
    fieldsHeaderCell.value = "Field Descriptions:";
    fieldsHeaderCell.font = { bold: true, size: 14, color: { argb: "FF10B981" } };
    currentRow += 2;

    fields.forEach((field) => {
      const fieldCell = instructionsSheet.getCell(`A${currentRow}`);
      const requiredText = field.isRequired ? " (REQUIRED)" : " (Optional)";
      fieldCell.value = `${field.header}${requiredText}`;
      fieldCell.font = { bold: true, size: 11 };
      currentRow++;

      const descCell = instructionsSheet.getCell(`A${currentRow}`);
      descCell.value = `  ${field.description || "No description"}`;
      descCell.font = { size: 10, italic: true };
      currentRow++;

      if (field.example) {
        const exampleCell = instructionsSheet.getCell(`A${currentRow}`);
        exampleCell.value = `  Example: ${field.example}`;
        exampleCell.font = { size: 10, color: { argb: "FF6B7280" } };
        currentRow++;
      }

      currentRow++;
    });

    // Add important notes
    currentRow += 2;
    const notesHeaderCell = instructionsSheet.getCell(`A${currentRow}`);
    notesHeaderCell.value = "Important Notes:";
    notesHeaderCell.font = { bold: true, size: 14, color: { argb: "FFEF4444" } };
    currentRow += 2;

    const notes = [
      "• All SKUs must exist in your products catalog before importing",
      "• Products must have status = 'active' to be imported",
      "• Sales Date will be automatically normalized to the first day of the month (reporting_month)",
      "• All sales data in one file must be for the same distributor",
      "• Revenue values should be net revenue (after discounts and returns)",
      "• Gross Revenue Local is optional and represents pre-discount/return amounts",
      "• Maximum file size: 10MB",
      "• Maximum rows per import: 5000",
      "• Do not modify column headers",
    ];

    notes.forEach((note) => {
      const noteCell = instructionsSheet.getCell(`A${currentRow}`);
      noteCell.value = note;
      noteCell.font = { size: 10 };
      currentRow++;
    });
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Get template filename
 */
export function getSalesTemplateFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `sales_import_template_${date}.xlsx`;
}

