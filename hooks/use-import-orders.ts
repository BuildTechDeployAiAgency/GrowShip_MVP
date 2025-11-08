"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ParsedOrder,
  ValidationResult,
  ImportSummary,
  FileUploadResponse,
  ValidationResponse,
  ImportResponse,
} from "@/types/import";
import { generateFileHashFromFile } from "@/utils/idempotency";

type ImportStep =
  | "upload"
  | "confirm"
  | "validate"
  | "validated"
  | "importing"
  | "completed";

interface UseImportOrdersReturn {
  // State
  step: ImportStep;
  loading: boolean;
  error: string | null;
  orders: ParsedOrder[];
  validationResults: ValidationResult | null;
  importSummary: ImportSummary | null;
  fileHash: string | null;
  fileName: string | null;
  brandId: string | null;
  
  // Actions
  uploadFile: (file: File) => Promise<void>;
  validateOrders: (distributorId: string) => Promise<void>;
  confirmImport: (distributorId: string) => Promise<void>;
  reset: () => void;
  downloadErrorReport: () => Promise<void>;
}

export function useImportOrders(): UseImportOrdersReturn {
  const [step, setStep] = useState<ImportStep>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  /**
   * Upload and parse Excel file
   */
  const uploadFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      // Generate file hash for idempotency
      const hash = await generateFileHashFromFile(file);
      setFileHash(hash);
      setFileName(file.name);
      setOriginalFile(file);

      // Upload file to API
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/orders", {
        method: "POST",
        body: formData,
      });

      const result: FileUploadResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload file");
      }

      if (result.data) {
        setOrders(result.data.orders);
        setBrandId(result.data.brandId);
        setStep("confirm");
        toast.success(`File parsed successfully! Found ${result.data.totalCount} orders.`);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
      toast.error(err.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate orders against business rules
   */
  const validateOrders = async (distributorId: string) => {
    if (!fileHash || !brandId) {
      setError("Missing file hash or brand ID");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("validate");

    try {
      const response = await fetch("/api/import/orders/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orders,
          distributorId,
          fileHash,
          brandId,
        }),
      });

      const result: ValidationResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Validation failed");
      }

      if (result.data) {
        setValidationResults(result.data);
        
        if (result.data.valid) {
          setStep("validated");
          toast.success("All orders passed validation!");
        } else {
          setStep("validated");
          toast.error(`Validation failed with ${result.data.errors.length} errors`);
        }
      }
    } catch (err: any) {
      console.error("Validation error:", err);
      setError(err.message || "Validation failed");
      toast.error(err.message || "Validation failed");
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
      setError("Cannot import invalid orders");
      return;
    }

    if (!fileHash || !brandId || !fileName) {
      setError("Missing required data");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("importing");

    try {
      const response = await fetch("/api/import/orders/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orders: validationResults.validOrders,
          distributorId,
          fileHash,
          fileName,
          brandId,
        }),
      });

      const result: ImportResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Import failed");
      }

      if (result.data) {
        setImportSummary(result.data);
        setStep("completed");
        
        if (result.data.failed > 0) {
          toast.warning(
            `Import completed with ${result.data.successful} successful and ${result.data.failed} failed orders`
          );
        } else {
          toast.success(`Successfully imported ${result.data.successful} orders!`);
        }
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "Import failed");
      toast.error(err.message || "Import failed");
      setStep("validated");
    } finally {
      setLoading(false);
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
      // Generate error report (this would call an API endpoint in a full implementation)
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
    setOrders([]);
    setValidationResults(null);
    setImportSummary(null);
    setFileHash(null);
    setFileName(null);
    setBrandId(null);
    setOriginalFile(null);
  };

  return {
    step,
    loading,
    error,
    orders,
    validationResults,
    importSummary,
    fileHash,
    fileName,
    brandId,
    uploadFile,
    validateOrders,
    confirmImport,
    reset,
    downloadErrorReport,
  };
}

