"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  FileText,
  Database,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  onTemplateUpload?: (file: File) => void;
}

export function TemplateModal({
  isOpen,
  onClose,
  userRole,
  onTemplateUpload,
}: TemplateModalProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const supabase = createClient();
  const isBrandAdmin = userRole === "brand_admin";

  const handleDownloadTemplate = async () => {
    try {
      // Get file from Supabase Storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from("templates")
        .download("templates/Template.xlsx");

      if (fileError) {
        console.error("File download error:", fileError);

        if (fileError.message.includes("Bucket not found")) {
          toast.error(
            "Templates bucket not found. Please contact your administrator to create the 'templates' bucket in Supabase Storage."
          );
        } else {
          toast.error("Failed to download template. Please try again.");
        }
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(fileData);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed. Please try again.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile || !user) return;

    setIsUploading(true);
    try {
      // Validate file type
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
      ];

      if (!allowedTypes.includes(uploadedFile.type)) {
        toast.error(
          "Invalid file type. Please upload an Excel file (.xlsx or .xls)"
        );
        return;
      }

      // Upload file to Supabase Storage
      const fileExt = uploadedFile.name.split(".").pop();
      const fileName = `Template.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("template")
        .upload(filePath, uploadedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);

        if (uploadError.message.includes("Bucket not found")) {
          toast.error(
            "Templates bucket not found. Please contact your administrator to create the 'templates' bucket in Supabase Storage."
          );
        } else {
          toast.error(`Failed to upload file: ${uploadError.message}`);
        }
        return;
      }

      // Insert template record into database
      const { data: templateRecord, error: insertError } = await supabase
        .from("template_management")
        .insert({
          template_name: "Template.xlsx",
          version_number: 1, // Simple versioning - always 1 for now
          file_name: fileName,
          file_path: filePath,
          file_size: uploadedFile.size,
          file_type: uploadedFile.type,
          uploaded_by: user.id,
          description: `Template uploaded by admin - ${new Date().toLocaleDateString()}`,
          required_columns: [
            "Country",
            "Company",
            "Product Name",
            "Type or Category",
            "Product description",
            "Year",
            "Month",
            "Orders in Progress",
            "Orders in Completed",
            "Sales Volume",
            "Stock on Hand (soh)",
            "Sales Value (usd)",
          ],
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Database insert error:", insertError);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from("templates").remove([filePath]);
        toast.error("Failed to save template record to database");
        return;
      }

      toast.success("Template uploaded and saved successfully!");
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Close modal after successful upload
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Data Import Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Section */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 mb-2">
                  Data Extraction Issues
                </h3>
                <p className="text-sm text-red-700 leading-relaxed">
                  This inconsistency makes it difficult for the platform to
                  accurately identify and extract the correct data. For
                  instance, Excel and CSV files often have completely different
                  column headers, leading to missed or incorrect data.
                </p>
              </div>
            </div>
          </div>

          {/* Solution Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800 mb-2">
                  Standardized Template Solution
                </h3>
                <p className="text-sm text-green-700 leading-relaxed">
                  To resolve the data extraction issues, we plan to introduce a
                  mandatory Excel template (Template.xlsx) that ensures
                  consistent data structure across all imports.
                </p>
              </div>
            </div>
          </div>

          {/* Template Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Template Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Standardized Columns
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">Data Validation</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Accurate Extraction
                </span>
              </div>
            </div>
          </div>

          {/* Required Columns */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Required Columns</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Country</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Company</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Product Name</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Type or Category</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Product description</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Year</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Orders in Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Orders in Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Sales Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Stock on Hand (soh)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Sales Value (usd)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={handleDownloadTemplate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template.xlsx
            </Button>

            {isBrandAdmin && (
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Template File
                </Button>
                {uploadedFile && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600 truncate">
                      {uploadedFile.name}
                    </span>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      size="sm"
                      className="ml-2"
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
