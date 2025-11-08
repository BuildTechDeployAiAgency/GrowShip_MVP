import ExcelJS from "exceljs";
import { ValidationError } from "@/types/import";

/**
 * Generate an error report Excel file with highlighted errors
 */
export async function generateErrorWorkbook(
  originalFileBuffer: Buffer,
  errors: ValidationError[]
): Promise<Buffer> {
  // Load the original workbook
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(originalFileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in the original file");
  }

  // Get the header row to find where to add the errors column
  const headerRow = worksheet.getRow(1);
  let lastColumn = 0;
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > lastColumn) {
      lastColumn = colNumber;
    }
  });

  // Add "Errors" column header
  const errorColumnIndex = lastColumn + 1;
  const errorHeaderCell = headerRow.getCell(errorColumnIndex);
  errorHeaderCell.value = "ERRORS";
  errorHeaderCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  errorHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF0000" },
  };
  errorHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getColumn(errorColumnIndex).width = 50;

  // Group errors by row
  const errorsByRow = new Map<number, ValidationError[]>();
  for (const error of errors) {
    if (error.row > 0) {
      const rowErrors = errorsByRow.get(error.row) || [];
      rowErrors.push(error);
      errorsByRow.set(error.row, rowErrors);
    }
  }

  // Add errors to rows and highlight them
  errorsByRow.forEach((rowErrors, rowNumber) => {
    const row = worksheet.getRow(rowNumber);
    
    // Highlight the entire row in red
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFCCCC" },
      };
      cell.font = { color: { argb: "FFCC0000" } };
    });

    // Add error messages to the errors column
    const errorCell = row.getCell(errorColumnIndex);
    const errorMessages = rowErrors.map((err) => {
      let msg = err.message;
      if (err.field) {
        msg = `[${err.field}] ${msg}`;
      }
      return msg;
    }).join("; ");

    errorCell.value = errorMessages;
    errorCell.font = { color: { argb: "FFCC0000" }, bold: true };
    errorCell.alignment = { wrapText: true, vertical: "top" };
  });

  // Add a summary sheet
  const summarySheet = workbook.addWorksheet("Error Summary", {
    properties: { tabColor: { argb: "FFFF0000" } },
  });

  summarySheet.getColumn(1).width = 15;
  summarySheet.getColumn(2).width = 60;
  summarySheet.getColumn(3).width = 20;

  // Add title
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "Import Validation Errors";
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFF0000" } };
  summarySheet.mergeCells("A1:C1");
  summarySheet.getRow(1).height = 25;

  // Add summary stats
  summarySheet.getCell("A3").value = "Total Errors:";
  summarySheet.getCell("A3").font = { bold: true };
  summarySheet.getCell("B3").value = errors.length;

  summarySheet.getCell("A4").value = "Affected Rows:";
  summarySheet.getCell("A4").font = { bold: true };
  summarySheet.getCell("B4").value = errorsByRow.size;

  // Add error details header
  summarySheet.getCell("A6").value = "Row";
  summarySheet.getCell("B6").value = "Error Message";
  summarySheet.getCell("C6").value = "Field";
  
  ["A6", "B6", "C6"].forEach((cell) => {
    summarySheet.getCell(cell).font = { bold: true, color: { argb: "FFFFFFFF" } };
    summarySheet.getCell(cell).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
  });

  // Add error details
  let currentRow = 7;
  errors.forEach((error) => {
    summarySheet.getCell(`A${currentRow}`).value = error.row;
    summarySheet.getCell(`B${currentRow}`).value = error.message;
    summarySheet.getCell(`C${currentRow}`).value = error.field || "N/A";
    
    summarySheet.getRow(currentRow).alignment = { vertical: "top" };
    summarySheet.getCell(`B${currentRow}`).alignment = { wrapText: true, vertical: "top" };
    
    currentRow++;
  });

  // Add instructions
  currentRow += 2;
  const instructionsCell = summarySheet.getCell(`A${currentRow}`);
  instructionsCell.value = "Instructions:";
  instructionsCell.font = { bold: true, size: 12 };
  currentRow++;

  const instructions = [
    "1. Review the errors in this summary sheet",
    "2. Go to the 'Orders' sheet to see errors highlighted in red",
    "3. Fix the errors in the highlighted rows",
    "4. Remove the 'ERRORS' column",
    "5. Remove this 'Error Summary' sheet",
    "6. Save and re-upload the file",
  ];

  instructions.forEach((instruction) => {
    summarySheet.getCell(`A${currentRow}`).value = instruction;
    summarySheet.getRow(currentRow).alignment = { wrapText: true };
    currentRow++;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Get error report filename
 */
export function getErrorReportFilename(originalFilename: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const nameWithoutExt = originalFilename.replace(/\.xlsx?$/i, "");
  return `${nameWithoutExt}_ERRORS_${timestamp}.xlsx`;
}

/**
 * Format errors for display
 */
export function formatErrorsForDisplay(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return "No errors found";
  }

  const errorsByRow = new Map<number, ValidationError[]>();
  for (const error of errors) {
    const rowErrors = errorsByRow.get(error.row) || [];
    rowErrors.push(error);
    errorsByRow.set(error.row, rowErrors);
  }

  const lines: string[] = [];
  errorsByRow.forEach((rowErrors, row) => {
    lines.push(`Row ${row}:`);
    rowErrors.forEach((error) => {
      const field = error.field ? `[${error.field}] ` : "";
      lines.push(`  - ${field}${error.message}`);
    });
  });

  return lines.join("\n");
}

