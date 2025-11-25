"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ParsedTarget, ValidationResult } from "@/types/import";

type ImportStep =
  | "upload"
  | "validated"
  | "importing"
  | "completed";

interface UseTargetImportReturn {
  // State
  step: ImportStep;
  loading: boolean;
  error: string | null;
  targets: ParsedTarget[];
  validationResults: ValidationResult | null;
  fileHash: string | null;
  fileName: string | null;
  brandId: string | null;
  importSummary: {
    total: number;
    successful: number;
    failed: number;
    importLogId: string;
    errors?: any[];
  } | null;
  
  // Actions
  uploadFile: (file: File) => Promise<void>;
  confirmImport: () => Promise<void>;
  reset: () => void;
}

export function useTargetImport(): UseTargetImportReturn {
  const [step, setStep] = useState<ImportStep>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<ParsedTarget[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<UseTargetImportReturn["importSummary"]>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);

  /**
   * Upload and parse Excel file
   */
  const uploadFile = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      setFileName(file.name);

      // Upload file to API
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      let response: Response;
      try {
        response = await fetch("/api/targets/import", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out. The file may be too large or the server is taking too long to respond.");
        }
        throw fetchError;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || "Failed to upload file";
        throw new Error(errorMessage);
      }

      if (result.data) {
        setFileHash(result.data.fileHash);
        setBrandId(result.data.brandId);
        setTargets(result.data.targets);
        
        // Validate targets immediately
        await validateTargets(result.data.targets, result.data.brandId);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to upload file";
      setError(errorMessage);
      toast.error(errorMessage);
      setFileName(null);
      setFileHash(null);
      setBrandId(null);
      setTargets([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate targets
   */
  const validateTargets = async (targetsToValidate: ParsedTarget[], brandIdToValidate: string) => {
    try {
      // Validation happens on the server during confirm, but we can show preview
      // For now, just set the targets and move to validated step
      setStep("validated");
    } catch (err: any) {
      const errorMessage = err.message || "Validation failed";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * Confirm and execute import
   */
  const confirmImport = async () => {
    if (!targets.length || !fileHash || !brandId || !fileName) {
      setError("Missing required data for import");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("importing");

    try {
      const response = await fetch("/api/targets/import/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targets,
          fileHash,
          fileName,
          brandId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || "Failed to import targets";
        
        // If validation errors, show them
        if (result.data?.validation) {
          setValidationResults(result.data.validation);
          setError("Validation failed. Please review the errors below.");
        } else {
          setError(errorMessage);
        }
        
        toast.error(errorMessage);
        setStep("validated");
        return;
      }

      // Success
      setImportSummary(result.data);
      setStep("completed");
      toast.success(`Successfully imported ${result.data.successful} target(s)`);
      
      if (result.data.failed > 0) {
        toast.warning(`${result.data.failed} target(s) failed to import`);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to import targets";
      setError(errorMessage);
      toast.error(errorMessage);
      setStep("validated");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset import state
   */
  const reset = () => {
    setStep("upload");
    setLoading(false);
    setError(null);
    setTargets([]);
    setValidationResults(null);
    setImportSummary(null);
    setFileHash(null);
    setFileName(null);
    setBrandId(null);
  };

  return {
    step,
    loading,
    error,
    targets,
    validationResults,
    fileHash,
    fileName,
    brandId,
    importSummary,
    uploadFile,
    confirmImport,
    reset,
  };
}

