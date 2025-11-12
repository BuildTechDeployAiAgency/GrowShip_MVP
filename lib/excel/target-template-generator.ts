import ExcelJS from "exceljs";
import { getEnabledTargetFields, TARGET_TEMPLATE_CONFIG } from "./target-template-config";

export interface GenerateTargetTemplateOptions {
  brandId: string;
  includeInstructions?: boolean;
  includeSampleData?: boolean;
}

/**
 * Generate an Excel template for target imports
 */
export async function generateTargetTemplate(
  options: GenerateTargetTemplateOptions
): Promise<Buffer> {
  const {
    includeInstructions = true,
    includeSampleData = true,
  } = options;

  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = "GrowShip";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create the main data sheet
  const dataSheet = workbook.addWorksheet("Targets", {
    properties: { tabColor: { argb: "FF0D9488" } },
  });

  // Get enabled fields
  const fields = getEnabledTargetFields();

  // Set up headers
  const headerRow = dataSheet.getRow(1);
  fields.forEach((field, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = field.header;
    
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
      cell.value = field.example || "";
      
      // Style sample row differently
      cell.font = { italic: true, color: { argb: "FF808080" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
    });
    sampleRow.commit();
  }

  // Freeze the header row
  dataSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // Create instructions sheet if requested
  if (includeInstructions) {
    const instructionsSheet = workbook.addWorksheet("Instructions", {
      properties: { tabColor: { argb: "FF70AD47" } },
    });

    instructionsSheet.getColumn(1).width = 80;

    // Add title
    const titleCell = instructionsSheet.getCell("A1");
    titleCell.value = "Sales Targets Import Template - Instructions";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF0D9488" } };
    titleCell.alignment = { vertical: "middle" };
    instructionsSheet.getRow(1).height = 25;

    // Add instructions
    let currentRow = 3;
    TARGET_TEMPLATE_CONFIG.instructions?.forEach((instruction) => {
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
    fieldsHeaderCell.font = { bold: true, size: 14, color: { argb: "FF0D9488" } };
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
        exampleCell.font = { size: 10, color: { argb: "FF808080" } };
        currentRow++;
      }

      currentRow++;
    });

    // Add important notes
    currentRow += 2;
    const notesHeaderCell = instructionsSheet.getCell(`A${currentRow}`);
    notesHeaderCell.value = "Important Notes:";
    notesHeaderCell.font = { bold: true, size: 14, color: { argb: "FFFF0000" } };
    currentRow += 2;

    const notes = [
      "• All SKUs must exist in your products catalog before importing",
      "• Products must have status = 'active' to be imported",
      "• Target Period should be the first day of the period (e.g., 2025-01-01 for January)",
      "• Period Type determines how the period is calculated",
      "• At least one of Target Quantity or Target Revenue should be provided",
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
export function getTargetTemplateFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `targets_import_template_${date}.xlsx`;
}

