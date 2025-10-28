"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  X,
  FileText,
  FileSpreadsheet,
  Image as FileImage,
} from "lucide-react";
import mammoth from "mammoth";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import { Spreadsheet as SpreadsheetComponent } from "react-spreadsheet";

// Dynamically import react-spreadsheet
const Spreadsheet = dynamic(
  () => import("react-spreadsheet").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    ),
  }
);

// PDF.js worker setup is now handled in the PDFViewer component

interface FilePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
}

export function FilePreviewDialog({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  fileSize,
}: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageInput, setPageInput] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string>("");
  const [workbook, setWorkbook] = useState<any>(null);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "csv":
      case "excel":
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case "pdf":
        return <FileText className="h-8 w-8 text-red-600" />;
      case "docx":
      case "doc":
        return <FileText className="h-8 w-8 text-blue-600" />;
      case "image":
        return <FileImage className="h-8 w-8 text-purple-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const convertToSpreadsheetData = (data: any[][]) => {
    if (!data || data.length === 0) return [[]];

    // Find the maximum number of columns
    const maxColumns = Math.max(...data.map((row) => (row ? row.length : 0)));

    // Convert array data to react-spreadsheet format, ensuring all rows have the same number of columns
    return data.map((row) => {
      const paddedRow = new Array(maxColumns).fill("");
      if (row) {
        row.forEach((cell, index) => {
          paddedRow[index] = cell || "";
        });
      }
      return paddedRow.map((cell) => ({
        value: cell || "",
      }));
    });
  };

  const loadSheetData = (workbook: any, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];

    if (worksheet) {
      // Use sheet_to_json with header: 1 to get array of arrays
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "", // Default value for empty cells
        raw: false, // Don't use raw values, format them
        blankrows: false, // Skip completely blank rows
      });

      console.log("Raw data from sheet:", rawData);
      console.log("Number of rows:", rawData.length);
      console.log(
        "Max columns:",
        Math.max(...rawData.map((row: any) => (row ? row.length : 0)))
      );

      // Filter out completely empty rows
      const filteredData = rawData.filter(
        (row: any) =>
          row && row.some((cell: any) => cell !== "" && cell != null)
      );

      console.log("Filtered data:", filteredData);
      console.log("Filtered rows:", filteredData.length);

      const spreadsheetData = convertToSpreadsheetData(filteredData as any[][]);
      setSpreadsheetData(spreadsheetData);
      setData(spreadsheetData);
      setLoading(false);
    } else {
      setError(`No data found in sheet: ${sheetName}`);
      setLoading(false);
    }
  };

  const renderPreview = async () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setPageInput("1");
    setScale(1.0);
    setUseFallbackViewer(false);
    setIframeError(false);

    try {
      switch (fileType) {
        case "pdf":
          // PDF preview is handled by react-pdf component
          setLoading(false);
          break;

        case "csv":
        case "excel":
          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();

          // For CSV files, use different options
          const options: XLSX.ParsingOptions =
            fileType === "csv"
              ? { type: "buffer", raw: false }
              : { type: "buffer" };

          const parsedWorkbook = XLSX.read(arrayBuffer, options);

          setWorkbook(parsedWorkbook);
          setSheets(parsedWorkbook.SheetNames);

          if (parsedWorkbook.SheetNames.length > 0) {
            const firstSheet = parsedWorkbook.SheetNames[0];
            setCurrentSheet(firstSheet);
            loadSheetData(parsedWorkbook, firstSheet);
          } else {
            setError("No sheets found in the spreadsheet");
            setLoading(false);
          }
          break;

        case "docx":
        case "doc":
          const docResponse = await fetch(fileUrl);
          const docArrayBuffer = await docResponse.arrayBuffer();
          const result = await mammoth.convertToHtml({
            arrayBuffer: docArrayBuffer,
          });

          setPreviewContent(
            <div
              className="prose max-w-none overflow-auto max-h-96"
              dangerouslySetInnerHTML={{ __html: result.value }}
            />
          );
          setLoading(false);
          break;

        case "image":
          setPreviewContent(
            <div className="flex justify-center">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-96 object-contain rounded-lg shadow-sm"
                onError={() => setError("Failed to load image")}
              />
            </div>
          );
          setLoading(false);
          break;

        default:
          setError(`Preview not supported for ${fileType} files`);
          setLoading(false);
          break;
      }
    } catch (err) {
      console.error("Error loading file preview:", err);
      setError("Failed to load file preview");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && fileUrl && isClient) {
      console.log("FilePreviewDialog opened with:", {
        fileUrl,
        fileName,
        fileType,
      });
      renderPreview();
    }
  }, [isOpen, fileUrl, fileType, isClient]);

  // Keyboard shortcuts for PDF navigation
  useEffect(() => {
    if (!isOpen || fileType !== "pdf" || !isClient) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Don't interfere with input fields

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePageChange(currentPage - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          handlePageChange(currentPage + 1);
          break;
        case "Home":
          e.preventDefault();
          handlePageChange(1);
          break;
        case "End":
          e.preventDefault();
          handlePageChange(numPages);
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          handleZoomReset();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, fileType, currentPage, numPages, scale]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setPageInput("1");
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setError("Failed to load PDF. Please check if the file is valid.");
    setLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      setPageInput(newPage.toString());
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      handlePageChange(page);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setScale(1.0);
  };

  const renderPDFPreview = () => {
    // Check if we're on client side
    if (!isClient) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-gray-500">Initializing PDF viewer...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* PDF Controls */}
        <div className="bg-gray-50 px-4 py-3 border border-gray-200 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center gap-1"
              >
                ← Previous
              </Button>

              <form
                onSubmit={handlePageInputSubmit}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className="w-12 text-center text-sm border border-gray-300 rounded px-1 py-1"
                  placeholder="1"
                />
                <span className="text-sm text-gray-500">/ {numPages}</span>
              </form>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="flex items-center gap-1"
              >
                Next →
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Zoom:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="px-2"
              >
                -
              </Button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                className="px-2"
              >
                +
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomReset}
                className="text-xs"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="flex justify-center p-4">
            {!iframeError ? (
              <iframe
                src={fileUrl}
                width="100%"
                height="600"
                className="border-0 rounded-lg shadow-lg"
                title={`PDF Preview - ${fileName}`}
                onLoad={() => {
                  console.log("PDF iframe loaded successfully");
                  if (numPages === 0) {
                    onDocumentLoadSuccess({ numPages: 1 });
                  }
                }}
                onError={(e) => {
                  console.log("PDF iframe failed to load:", e);
                  setIframeError(true);
                }}
                style={{
                  minHeight: "600px",
                }}
              />
            ) : (
              <div className="w-full h-[600px] flex flex-col items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  PDF Preview
                </h3>
                <p className="text-gray-500 mb-4 text-center max-w-md">
                  Unable to display PDF inline. Click the button below to open
                  it in a new tab.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(fileUrl, "_blank")}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Open PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIframeError(false)}
                    className="flex items-center gap-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Info */}
        <div className="text-center text-sm text-gray-500">
          Page {currentPage} of {numPages || 1} • {fileName}
        </div>

        {/* PDF Generator Demo */}
        <div className="mt-6">
          {/* <PDFGenerator
            data={{ fileName, fileUrl }}
            fileName={`generated-${fileName.replace(/\.[^/.]+$/, "")}`}
          /> */}
          {/* <PDFViewer
            document={{
              url: fileUrl,
            }}
          /> */}
        </div>
      </div>
    );
  };

  const renderSpreadsheetPreview = () => {
    if (typeof window === "undefined" || !Spreadsheet) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading spreadsheet viewer...</p>
          </div>
        </div>
      );
    }

    if (spreadsheetData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-medium">
              Spreadsheet Preview - {fileName}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setData(spreadsheetData)}
              className="text-xs"
            >
              Reset
            </Button>
          </div>
          {sheets.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sheet:</span>
              <select
                value={currentSheet}
                onChange={(e) => {
                  setCurrentSheet(e.target.value);
                  loadSheetData(workbook, e.target.value);
                }}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                {sheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="overflow-auto max-h-96">
          {data.length > 0 && (
            <div className="text-xs text-gray-500 mb-2 px-2">
              Rows: {data.length}, Columns: {data[0]?.length || 0}
            </div>
          )}
          <SpreadsheetComponent
            data={data}
            onChange={setData}
            className="w-full"
          />
        </div>
      </div>
    );
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(fileType)}
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {fileName}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {fileType.toUpperCase()}
                  </Badge>
                  {fileSize && (
                    <span className="text-sm text-gray-500">
                      {formatFileSize(fileSize)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
              </div>
            </div>
          ) : fileType === "pdf" ? (
            renderPDFPreview()
          ) : fileType === "csv" || fileType === "excel" ? (
            renderSpreadsheetPreview()
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 overflow-auto max-h-96">
              {previewContent}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
