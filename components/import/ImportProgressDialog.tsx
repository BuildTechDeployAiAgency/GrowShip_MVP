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
}

export function ImportProgressDialog({
  open,
  progress,
  status,
  summary,
  onClose,
}: ImportProgressDialogProps) {
  const isProcessing = status === "processing";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isProcessing && "Importing Orders..."}
            {isCompleted && "Import Complete!"}
            {isFailed && "Import Failed"}
          </DialogTitle>
          <DialogDescription>
            {isProcessing && "Please wait while we process your orders"}
            {isCompleted && "Your orders have been successfully imported"}
            {isFailed && "An error occurred during the import"}
          </DialogDescription>
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
            <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-32 overflow-y-auto">
              <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
              <ul className="space-y-1">
                {summary.errors.slice(0, 5).map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    • {error.message}
                  </li>
                ))}
              </ul>
              {summary.errors.length > 5 && (
                <p className="text-xs text-red-600 mt-2">
                  And {summary.errors.length - 5} more errors...
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

