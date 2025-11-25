"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ParsedSalesRow,
  ValidationResult,
  ImportSummary,
  FileUploadResponse,
  ValidationResponse,
  ImportResponse,
} from "@/types/import";

type ImportStep =
  | "upload"
  | "confirm"
  | "validate"
  | "validated"
  | "importing"
  | "completed";

interface UseImportSalesReturn {
  // State
  step: ImportStep;
  loading: boolean;
  error: string | null;
  salesRows: ParsedSalesRow[];
  validationResults: ValidationResult | null;
  importSummary: ImportSummary | null;
  fileHash: string | null;
  fileName: string | null;
  brandId: string | null;
  
  // Actions
  uploadFile: (file: File) => Promise<void>;
  validateSalesRows: (distributorId: string) => Promise<void>;
  confirmImport: (distributorId: string) => Promise<void>;
  reset: () => void;
  downloadErrorReport: () => Promise<void>;
}

export function useImportSales(): UseImportSalesReturn {
  const [step, setStep] = useState<ImportStep>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesRows, setSalesRows] = useState<ParsedSalesRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [extractedDistributorId, setExtractedDistributorId] = useState<string | null>(null);

  /**
   * Upload and parse Excel file
   */
  const uploadFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      // Store file name and file reference before API call
      setFileName(file.name);
      setOriginalFile(file);

      // Upload file to API with timeout
      const formData = new FormData();
      formData.append("file", file);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      let response: Response;
      try {
        response = await fetch("/api/import/sales", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out. The file may be too large or the server is taking too long to respond. Please try again.");
        }
        throw fetchError;
      }

      let result: FileUploadResponse;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error("Failed to parse server response. Please check your file format and try again.");
      }

      if (!response.ok || !result.success) {
        const errorMessage = result.error || "Failed to upload file";
        throw new Error(errorMessage);
      }

      if (result.data && result.data.salesRows) {
        // Use API's fileHash for consistency between client and server
        const apiFileHash = result.data.fileHash;
        const apiBrandId = result.data.brandId;

        // Debug logging
        console.log("[Import Sales Hook] Upload successful - setting state", {
          fileHash: apiFileHash,
          brandId: apiBrandId,
          salesRowsCount: result.data.salesRows.length,
          hasFileHash: !!apiFileHash,
          hasBrandId: !!apiBrandId,
        });

        // Validate that required state is present
        if (!apiFileHash) {
          const errorMsg = "File hash not returned from server. Please try uploading again.";
          setError(errorMsg);
          toast.error(errorMsg);
          setFileName(null);
          setOriginalFile(null);
          return;
        }

        if (!apiBrandId) {
          const errorMsg = "Brand ID not found. Please ensure your account is associated with a brand. Contact your administrator if you need assistance.";
          setError(errorMsg);
          toast.error(errorMsg, {
            duration: 8000,
            description: "Super admin users may need to select a brand for imports.",
          });
          setFileName(null);
          setOriginalFile(null);
          return;
        }

        // Set state values
        setFileHash(apiFileHash);
        setBrandId(apiBrandId);
        setSalesRows(result.data.salesRows);
        setExtractedDistributorId(result.data.extractedDistributorId || null);
        
        // Debug logging after state is set
        console.log("[Import Sales Hook] State set successfully", {
          fileHash: apiFileHash,
          brandId: apiBrandId,
          salesRowsCount: result.data.salesRows.length,
        });
        
        setStep("confirm");
        
        // Show warning if distributor ID is inconsistent
        if (!result.data.distributorIdConsistent) {
          toast.warning("Multiple distributor IDs found in sheet. Please ensure all rows have the same distributor ID.");
        }
        
        toast.success(`File parsed successfully! Found ${result.data.totalCount} sales records.`);
      } else {
        throw new Error("No data returned from server. Please try again.");
      }
    } catch (err: any) {
      console.error("Upload error:", {
        error: err,
        message: err.message,
        stack: err.stack,
        fileName: file.name,
        fileSize: file.size,
      });
      
      let errorMessage = "Failed to upload file. Please check your file and try again.";
      
      // Handle specific error types
      if (err.name === "AbortError") {
        errorMessage = "Upload timed out. The file may be too large or the server is taking too long. Please try again with a smaller file.";
      } else if (err.message?.includes("Failed to parse")) {
        errorMessage = err.message;
      } else if (err.message?.includes("timed out")) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 6000,
        description: "If this problem persists, please contact support.",
      });
      // Reset file selection on error
      setFileName(null);
      setFileHash(null);
      setOriginalFile(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate sales rows against business rules
   */
  const validateSalesRows = async (distributorId: string) => {
    // Debug logging before validation
    console.log("[Import Sales Hook] validateSalesRows called", {
      fileHash: !!fileHash,
      brandId: !!brandId,
      fileHashValue: fileHash,
      brandIdValue: brandId,
      distributorId,
      salesRowsCount: salesRows.length,
    });

    if (!fileHash || !brandId) {
      const errorMsg = "Missing file hash or brand ID. Please upload the file again.";
      console.error("[Import Sales Hook] Validation failed - missing required state", {
        fileHash: !!fileHash,
        brandId: !!brandId,
      });
      setError(errorMsg);
      toast.error(errorMsg, {
        duration: 8000,
        description: "The upload may have failed silently. Please try uploading again.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setStep("validate");

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

      let response: Response;
      try {
        response = await fetch("/api/import/sales/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            salesRows,
            distributorId,
            fileHash,
            brandId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Validation request timed out. Please try again.");
        }
        throw fetchError;
      }

      // Clone response for error handling (response body can only be read once)
      const responseClone = response.clone();
      let result: ValidationResponse;
      
      try {
        result = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text response from clone
        try {
          const textResponse = await responseClone.text();
          console.error("[Import Sales Hook] Failed to parse JSON response", {
            status: response.status,
            statusText: response.statusText,
            textResponse,
          });
          throw new Error(`Validation failed: ${response.statusText || "Unknown error"}. ${textResponse || ""}`);
        } catch (textError) {
          console.error("[Import Sales Hook] Failed to parse both JSON and text response", {
            status: response.status,
            statusText: response.statusText,
            jsonError,
            textError,
          });
          throw new Error(`Validation failed: ${response.statusText || "Unknown error"} (Status: ${response.status})`);
        }
      }

      if (!response.ok) {
        // Extract error message from response
        let errorMsg = `Validation failed with status ${response.status}`;
        
        if (result) {
          errorMsg = result.error || (result as any).message || (result.error as any)?.message || errorMsg;
          if (result.data && typeof result.data === 'object' && 'error' in result.data) {
            errorMsg = (result.data as any).error || errorMsg;
          }
        }
        
        console.error("[Import Sales Hook] Validation API returned error", {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          result,
        });
        
        throw new Error(errorMsg);
      }

      if (result.data) {
        setValidationResults(result.data);
        
        if (result.data.valid) {
          setStep("validated");
          toast.success("All sales records passed validation!");
        } else {
          setStep("validated");
          toast.error(`Validation failed with ${result.data.errors.length} errors`);
        }
      } else {
        throw new Error("No validation data returned. Please try again.");
      }
    } catch (err: any) {
      console.error("[Import Sales Hook] Validation error:", err);
      
      let errorMessage = "Validation failed. Please check your data and try again.";
      
      // Handle specific error types
      if (err?.name === "AbortError") {
        errorMessage = "Validation request timed out. Please try again.";
      } else if (err?.message?.includes("timed out")) {
        errorMessage = err.message;
      } else if (err?.message?.includes("Failed to parse")) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err?.message?.includes("fetch")) {
        errorMessage = "Network error during validation. Please check your internet connection and try again.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 6000,
        description: "Please review your data and try again.",
      });
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirm and execute import
   */
  const confirmImport = async (distributorId: string) => {
    if (!validationResults || !validationResults.valid) {
      const errorMsg = "Cannot import invalid sales data. Please fix validation errors first.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!fileHash || !brandId || !fileName) {
      const errorMsg = "Missing required data. Please upload the file again.";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    setStep("importing");

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      let response: Response;
      try {
        response = await fetch("/api/import/sales/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            salesRows: validationResults.validSalesRows,
            distributorId,
            fileHash,
            fileName,
            brandId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Import request timed out. The import may still be processing. Please check your sales data.");
        }
        throw fetchError;
      }

      let result: ImportResponse;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error("Failed to parse import response. Please check if sales data was imported.");
      }

      console.log("[Import Sales Hook] API Response:", {
        ok: response.ok,
        success: result.success,
        hasData: !!result.data,
        data: result.data,
      });

      // Always set importSummary if we have data
      if (result.data) {
        console.log("[Import Sales Hook] Setting importSummary and step to completed", result.data);
        setLoading(false);
        setImportSummary(result.data);
        setStep("completed");
        
        if (result.data.successful === 0) {
          // Complete failure
          toast.error(
            `Import failed: None of the ${result.data.total} sales records could be imported.`,
            {
              duration: 8000,
              description: result.data.errors?.length 
                ? `${result.data.errors.length} errors occurred. Please check the details.`
                : "Please check your data and try again.",
            }
          );
        } else if (result.data.failed > 0) {
          // Partial success
          toast.warning(
            `Import completed with ${result.data.successful} successful and ${result.data.failed} failed records`,
            {
              duration: 8000,
              description: result.data.errors?.length 
                ? `${result.data.errors.length} errors occurred during import.`
                : "Some sales records could not be imported.",
            }
          );
        } else {
          // Full success
          toast.success(`Successfully imported ${result.data.successful} sales records!`, {
            duration: 5000,
          });
        }
        return;
      }

      // If no data and response is not ok, throw error
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Import failed. No sales data was imported.");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      
      let errorMessage = "Import failed. Please try again.";
      
      // Handle specific error types
      if (err.name === "AbortError") {
        errorMessage = "Import request timed out. The import may still be processing. Please check your sales data list.";
      } else if (err.message?.includes("timed out")) {
        errorMessage = err.message;
      } else if (err.message?.includes("Failed to parse")) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = "Network error during import. Please check your internet connection and try again.";
      }
      
      console.log("[Import Sales Hook] Error occurred - setting step to completed with error", errorMessage);
      setLoading(false);
      setError(errorMessage);
      setStep("completed");
      toast.error(errorMessage, {
        duration: 8000,
        description: "If this problem persists, please contact support with the error details.",
      });
    }
  };

  /**
   * Download error report
   */
  const downloadErrorReport = async () => {
    if (!validationResults || !originalFile) {
      toast.error("No errors to report");
      return;
    }

    try {
      toast.info("Error report download coming soon");
      // TODO: Implement error report generation
    } catch (err: any) {
      console.error("Error downloading report:", err);
      toast.error("Failed to download error report");
    }
  };

  /**
   * Reset state
   */
  const reset = () => {
    setStep("upload");
    setLoading(false);
    setError(null);
    setSalesRows([]);
    setValidationResults(null);
    setImportSummary(null);
    setFileHash(null);
    setFileName(null);
    setBrandId(null);
    setOriginalFile(null);
    setExtractedDistributorId(null);
  };

  return {
    step,
    loading,
    error,
    salesRows,
    validationResults,
    importSummary,
    fileHash,
    fileName,
    brandId,
    uploadFile,
    validateSalesRows,
    confirmImport,
    reset,
    downloadErrorReport,
  };
}

