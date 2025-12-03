"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/import/FileUploader";
import { useTargetImport } from "@/hooks/use-target-import";
import { ParsedTarget, ValidationResult } from "@/types/import";
import { CheckCircle2, XCircle, Download, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface TargetUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TargetUploadDialog({
  open,
  onClose,
  onSuccess,
}: TargetUploadDialogProps) {
  const {
    step,
    loading,
    error,
    targets,
    validationResults,
    importSummary,
    uploadFile,
    confirmImport,
    reset,
  } = useTargetImport();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSuccess = () => {
    reset();
    onSuccess?.();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/targets/template");
      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `targets_import_template_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to download template");
    }
  };

  const renderContent = () => {
    if (step === "upload") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Upload an Excel file with your sales targets. Download the template below to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>
          <FileUploader
            onFileSelect={uploadFile}
            loading={loading}
            acceptedTypes={[".xlsx", ".xls"]}
            maxSizeMB={10}
          />
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      );
    }

    if (step === "validated") {
      const hasErrors = validationResults && validationResults.errors.length > 0;
      const errorsByRow = validationResults
        ? validationResults.errors.reduce((acc, error) => {
            if (!acc[error.row]) {
              acc[error.row] = [];
            }
            acc[error.row].push(error);
            return acc;
          }, {} as Record<number, typeof validationResults.errors>)
        : {};

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Preview Targets
            </h3>
            <p className="text-sm text-gray-600">
              {hasErrors
                ? "Please review the errors below. Invalid targets will be skipped."
                : `Found ${targets.length} valid target(s) ready to import.`}
            </p>
          </div>

          {/* Summary Stats */}
          {validationResults && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(validationResults.validTargets?.length || 0) + (validationResults.invalidTargets?.length || 0)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-600">Valid</p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {validationResults.validTargets?.length || 0}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-600">Invalid</p>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {validationResults.invalidTargets?.length || 0}
                </p>
              </div>
            </div>
          )}

          {/* Errors List */}
          {hasErrors && validationResults && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Error Details:
              </h4>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Row
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Field
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.errors.slice(0, 50).map((error, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-gray-900">{error.row}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {error.field || "-"}
                        </td>
                        <td className="px-4 py-2 text-red-600">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validationResults.errors.length > 50 && (
                  <div className="p-2 text-xs text-gray-500 text-center">
                    Showing first 50 errors. Total: {validationResults.errors.length}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {targets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Targets to Import ({targets.length}):
              </h4>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        SKU
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Period
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {targets.slice(0, 20).map((target, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-gray-900">{target.sku}</td>
                        <td className="px-4 py-2 text-gray-600">{target.target_period}</td>
                        <td className="px-4 py-2 text-gray-600 capitalize">
                          {target.period_type}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {target.target_quantity?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {target.target_revenue
                            ? formatCurrency(target.target_revenue)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {targets.length > 20 && (
                  <div className="p-2 text-xs text-gray-500 text-center">
                    Showing first 20 targets. Total: {targets.length}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      );
    }

    if (step === "importing") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-teal-600 animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-900">Importing targets...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we import your targets.</p>
            </div>
          </div>
        </div>
      );
    }

    if (step === "completed" && importSummary) {
      return (
        <div className="space-y-4">
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Import Completed!
            </h3>
            <p className="text-sm text-gray-600">
              Successfully imported {importSummary.successful} of {importSummary.total} target(s)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{importSummary.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-600">Imported</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {importSummary.successful}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-red-600">Failed</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {importSummary.failed}
              </p>
            </div>
          </div>

          {importSummary.errors && importSummary.errors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    Some targets failed to import
                  </p>
                  <p className="text-xs text-amber-700">
                    {importSummary.errors.length} error(s) occurred during import
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Sales Targets</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import sales targets in bulk
          </DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </>
          )}
          {step === "validated" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={confirmImport}
                disabled={loading || (validationResults?.validTargets?.length || 0) === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${validationResults?.validTargets?.length || 0} Target(s)`
                )}
              </Button>
            </>
          )}
          {step === "importing" && (
            <Button variant="outline" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </Button>
          )}
          {step === "completed" && (
            <Button onClick={handleSuccess}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

