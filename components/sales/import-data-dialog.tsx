"use client";

import * as React from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "react-toastify";

interface ImportDataDialogProps {
  trigger?: React.ReactNode;
  authToken?: string;
  userId?: string;
  onUploadSuccess?: (result: any) => void;
}

export function ImportDataDialog({ trigger, authToken, userId, onUploadSuccess }: ImportDataDialogProps) {
  const { user} = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentStep, setCurrentStep] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Security constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;
  const ALLOWED_MIME_TYPES = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  const validateFile = (file: File): string | null => {
    // Check file extension
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      return "Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.";
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "") {
      return "Invalid file MIME type. Please upload a valid Excel or CSV file.";
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please upload a smaller file.`;
    }

    // Check for empty files
    if (file.size === 0) {
      return "File is empty. Please upload a valid file.";
    }

    // Sanitize filename
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitizedFilename !== file.name) {
      console.warn("Filename contains potentially unsafe characters:", file.name);
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setSelectedFile(file);
      setError(null);
      setUploadSuccess(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const handleDialogClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setUploadSuccess(false);
    setProgress(0);
    setCurrentStep("");
    setError(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };


  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setCurrentStep("");

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (user?.id) {
      formData.append('user_id', user.id);
      formData.append('brand_id', user.id);
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/upload-and-process`,
        {
            method: 'POST',
            body: formData,
        }
    );
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Upload failed';
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                if (data.progress !== undefined) {
                  setProgress(data.progress);
                }
                
                if (data.step) {
                  setCurrentStep(data.step);
                }
                
                if (data.show_notification === true) {
                  if (data.type === 'success') {
                    toast.success(data.message || "Step completed successfully!", {
                      position: "top-right",
                      autoClose: 3000,
                      hideProgressBar: false,
                      closeOnClick: true,
                      pauseOnHover: true,
                      draggable: true,
                    });
                  } else if (data.type === 'error') {
                    toast.error(data.message || "Step failed!", {
                      position: "top-right",
                      autoClose: 5000,
                      hideProgressBar: false,
                      closeOnClick: true,
                      pauseOnHover: true,
                      draggable: true,
                    });
                  } else if (data.type === 'info') {
                    toast.info(data.message || "Processing...", {
                      position: "top-right",
                      autoClose: 2000,
                      hideProgressBar: false,
                      closeOnClick: true,
                      pauseOnHover: true,
                      draggable: true,
                    });
                  }
                }
                
                if (data.final === true) {
                  setUploadSuccess(true);
                  onUploadSuccess?.(data);
                  
                  toast.success("File uploaded and processed successfully!", {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                  });
                  
                  setTimeout(() => {
                    setIsOpen(false);
                    setSelectedFile(null);
                    setUploadSuccess(false);
                    setProgress(0);
                    setCurrentStep("");
                  }, 2000);
                }
              } catch (parseError) {
                console.warn('Failed to parse JSON:', line);
              }
            }
          }
        }
      } else {
        const result = await response.json();
        setProgress(100);
        setUploadSuccess(true);
        onUploadSuccess?.(result);
        
        toast.success("File uploaded and processed successfully!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        setTimeout(() => {
          setIsOpen(false);
          setSelectedFile(null);
          setUploadSuccess(false);
          setProgress(0);
          setCurrentStep("");
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `Date,SKU,Product Name,Category,Retailer,Territory,Revenue,Volume,Target\n2024-10-01,PRD-001,Sample Product,Electronics,Walmart,North America,50000,1000,45000\n2024-10-01,PRD-002,Sample Product 2,Apparel,Target,Europe,35000,750,30000`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_data_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleDialogClose();
      } else {
        setIsOpen(open);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-teal-600" />
            Import Sales Data
          </DialogTitle>
          <DialogDescription>
            Upload your distributor sales reports in Excel or CSV format.
            Download our template to ensure proper formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Need a template?
                </h4>
                <p className="text-xs text-blue-700 mb-3">
                  Download our pre-formatted template to ensure your data is
                  structured correctly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="bg-white hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Upload File
            </label>

            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Drop your file here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports Excel (.xlsx, .xls) and CSV (.csv) files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  {!uploading && !uploadSuccess && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadSuccess && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {uploading && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {currentStep || "Processing..."}
                  </span>
                  <span className="text-sm font-medium text-teal-600">
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {currentStep && (
                  <p className="text-xs text-gray-500 mt-1">
                    {currentStep}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Required Columns
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">SKU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Product Name</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Category</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Retailer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Territory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full"></div>
                <span className="text-gray-700">Volume</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              uploading ||
              uploadSuccess
            }
            className="bg-teal-600 hover:bg-teal-700"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Uploading...
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Uploaded
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
