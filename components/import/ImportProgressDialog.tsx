"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ImportSummary } from "@/types/import";

interface ImportProgressDialogProps {
  open: boolean;
  progress: number;
  status: "processing" | "completed" | "failed";
  summary?: ImportSummary;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function ImportProgressDialog({
  open,
  progress,
  status,
  summary,
  onClose,
  title,
  description,
}: ImportProgressDialogProps) {
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  const dialogTitle = title || (
    isProcessing ? "Processing File..." :
    isCompleted && summary && summary.failed === 0 ? "Import Complete!" :
    isCompleted && summary && summary.successful > 0 ? "Import Partially Complete" :
    isCompleted ? "Import Complete!" :
    "Import Failed"
  );

  const dialogDescription = description || (
    isProcessing ? "Please wait while we process your file" :
    isCompleted && summary && summary.failed === 0 ? `All ${summary.successful} orders were imported successfully` :
    isCompleted && summary && summary.successful > 0 ? `${summary.successful} orders imported, ${summary.failed} failed` :
    isCompleted ? "Your orders have been imported" :
    "An error occurred during the import"
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-gray-600">
                {progress}% Complete
              </p>
            </div>
          )}

          {/* Status Icon */}
          <div className="flex justify-center">
            {isProcessing && (
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            )}
            {isCompleted && (
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            )}
            {isFailed && (
              <XCircle className="h-16 w-16 text-red-600" />
            )}
          </div>

          {/* Summary Stats */}
          {summary && !isProcessing && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                <p className="text-xs text-gray-600 mt-1">Total</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{summary.successful}</p>
                <p className="text-xs text-green-600 mt-1">Success</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                <p className="text-xs text-red-600 mt-1">Failed</p>
              </div>
            </div>
          )}

          {/* Error Details */}
          {summary && summary.errors && summary.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium text-red-900 mb-3">
                Error Details ({summary.errors.length} error{summary.errors.length !== 1 ? 's' : ''}):
              </p>
              <div className="space-y-2">
                {summary.errors.slice(0, 10).map((error: any, idx: number) => (
                  <div key={idx} className="text-sm text-red-700 border-b border-red-100 pb-2 last:border-0">
                    {error.batch ? (
                      <div>
                        <p className="font-medium">Batch {error.batch}:</p>
                        <p className="ml-4">{error.error || error.message}</p>
                        {error.rows && error.rows.length > 0 && (
                          <p className="ml-4 text-xs text-gray-600">
                            Rows: {error.rows.join(", ")}
                          </p>
                        )}
                        {error.details && (
                          <p className="ml-4 text-xs text-gray-600">
                            {error.details}
                          </p>
                        )}
                        {error.hint && (
                          <p className="ml-4 text-xs text-amber-600">
                            Hint: {error.hint}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p>
                          {error.row && <span className="font-medium">Row {error.row}: </span>}
                          {error.field && <span className="text-gray-600">({error.field}) </span>}
                          {error.message}
                        </p>
                        {error.code && (
                          <p className="text-xs text-gray-500 ml-4">Code: {error.code}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {summary.errors.length > 10 && (
                <p className="text-xs text-red-600 mt-3 pt-2 border-t border-red-200">
                  And {summary.errors.length - 10} more errors. See full details on the import page.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

