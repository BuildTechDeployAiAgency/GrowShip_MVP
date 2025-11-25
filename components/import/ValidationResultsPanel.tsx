"use client";

import { ValidationResult } from "@/types/import";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download, AlertCircle } from "lucide-react";

interface ValidationResultsPanelProps {
  results: ValidationResult;
  onDownloadErrors?: () => void;
  onProceed?: () => void;
  loading?: boolean;
  entityName?: string;
}

export function ValidationResultsPanel({
  results,
  onDownloadErrors,
  onProceed,
  loading = false,
  entityName = "Orders",
}: ValidationResultsPanelProps) {
  const hasErrors = results.errors.length > 0;
  
  // Determine entity type and get counts dynamically
  const validCount = 
    results.validProducts?.length || 
    results.validSalesRows?.length || 
    results.validOrders?.length || 
    results.validTargets?.length || 
    0;
  
  const invalidCount = 
    results.invalidProducts?.length || 
    results.invalidSalesRows?.length || 
    results.invalidOrders?.length || 
    results.invalidTargets?.length || 
    0;
  
  const totalCount = validCount + invalidCount;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Validation Results
          </h3>
          <p className="text-sm text-gray-600">
            {hasErrors
              ? "Please fix the errors below and re-upload the file"
              : "All validations passed! You can proceed with the import."}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600 mb-1">Total {entityName}</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalCount}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-600">Valid</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {validCount}
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-600">Invalid</p>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {invalidCount}
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-600">Errors</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {results.errors.length}
            </p>
          </div>
        </div>

        {/* Errors List */}
        {hasErrors && (
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
                      Error Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.errors.map((error, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">
                        {error.row}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                        {error.field || "-"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {error.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!hasErrors && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">
                  Validation Successful!
                </h4>
                <p className="text-sm text-green-700">
                  All {validCount} {entityName.toLowerCase()} passed validation and are ready to import.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {hasErrors && onDownloadErrors && (
            <Button
              variant="outline"
              onClick={onDownloadErrors}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Error Report
            </Button>
          )}
          
          {!hasErrors && onProceed && (
            <Button
              onClick={onProceed}
              disabled={loading || validCount === 0}
            >
              {loading ? "Processing..." : `Proceed with ${validCount} ${entityName}`}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

