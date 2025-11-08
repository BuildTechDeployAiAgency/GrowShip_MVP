"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Upload,
  FileText,
  Calendar,
  Filter,
  Download,
  Trash2,
  Eye,
  X,
  Grid3X3,
  List,
  CheckSquare,
  Square,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  EnhancedAuthProvider,
  useEnhancedAuth,
} from "@/contexts/enhanced-auth-context";
import { HeaderNotificationButton } from "@/components/sales/header-notification-button";
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";

// Loading skeleton for reports page
function ReportsPageSkeleton() {
  return (
    <MainLayout
      pageTitle="Sales Reports"
      pageSubtitle="Upload, manage, and track your sales documents"
    >
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </MainLayout>
  );
}

interface UploadedReport {
  id: string;
  name: string;
  documentId: string;
  organizationId: string;
  url: string;
  uploadedAt: string; // ISO
  size?: number;
  fileType: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  company_name?: string;
  brand_id?: string;
  storage_path: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  description?: string;
}

export default function SalesReportPage() {
  return (
    <EnhancedAuthProvider>
      <SalesReportsComponent />
    </EnhancedAuthProvider>
  );
}

function SalesReportsComponent() {
  const { user } = useAuth();
  const { profile } = useEnhancedAuth();
  const supabase = useMemo(() => createClient(), []);
  const bucket = "sales-reports";

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [reports, setReports] = useState<UploadedReport[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedReport | null>(null);

  const getFileType = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "csv":
        return "csv";
      case "xlsx":
      case "xls":
        return "excel";
      case "pdf":
        return "pdf";
      case "txt":
        return "text";
      default:
        return "file";
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "csv":
        return "📊";
      case "excel":
        return "📈";
      case "pdf":
        return "📄";
      case "text":
        return "📝";
      default:
        return "📁";
    }
  };

  const listReports = async () => {
    if (!user || !profile) {
      console.log("Missing user or profile:", {
        user: !!user,
        profile: !!profile,
      });
      return;
    }
    setIsLoadingList(true);
    try {
      let query = supabase.from("sales_documents_storage").select(
        `
          *,
          user_profiles (
            user_id,
            role_type,
            company_name,
            contact_name,
            email,
            phone
          )
        `
      );

      // Brand admins can see all reports from their organization
      // Other users can only see their own reports
      if (profile.role_name?.startsWith("brand_admin")) {
        console.log(
          "Brand admin - filtering by organization:",
          profile.brand_id
        );
        query = query.eq("brand_id", profile.brand_id);
      } else {
        console.log("Other user - filtering by user_id:", user.id);
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        console.error("Error fetching reports:", error);
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        toast.error(`Failed to load reports: ${error.message}`);
        return;
      }

      console.log("Successfully fetched data:", data?.length || 0, "documents");
      console.log("Raw data sample:", data?.[0]);

      const items = (data || []).map((doc: any) => {
        const userInfo = doc.user_profiles || {};

        return {
          id: doc.id,
          name: doc.document_name || "Unknown",
          documentId: doc.document_id || doc.id,
          organizationId: doc.brand_id || "Unknown",
          url: supabase.storage.from(bucket).getPublicUrl(doc.document_path)
            .data.publicUrl,
          uploadedAt: doc.created_at || new Date().toISOString(),
          size: doc.file_size || 0,
          fileType: getFileType(doc.document_name || ""),
          user_id: doc.user_id,
          user_name: userInfo.contact_name || "Unknown User",
          user_email: userInfo.email || "",
          company_name: userInfo.company_name || "Unknown Company",
          brand_id: doc.brand_id,
          storage_path: doc.document_path,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          status: doc.status || "active",
          description: doc.description || "",
        };
      });

      console.log("Processed items:", items.length);
      setReports(items);
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        `Failed to load reports: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoadingList(false);
    }
  };

  console.log("User:", profile);

  const handleUpload = async () => {
    if (!file || !user) return;

    // Security constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv|pdf)$/i;
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
    ];

    // Validate file type
    if (!allowedTypes.includes(file.type) && !ALLOWED_EXTENSIONS.test(file.name)) {
      toast.error("Please upload a CSV, Excel, or PDF file");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Check for empty files
    if (file.size === 0) {
      toast.error("File is empty. Please upload a valid file.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.id);
      formData.append("brand_id", profile?.brand_id || "");

      // Determine API endpoint based on file type
      const isPdf = file.type === "application/pdf";
      const apiEndpoint = isPdf
        ? `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/pdf/upload-and-process`
        : `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/excel/upload-and-process`;

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upload error:", errorData);
        toast.error(errorData.message || "Failed to upload and process file");
        return;
      }

      const result = await response.json();
      console.log("Upload and processing result:", result);

      toast.success(
        result.message || "File uploaded and processed successfully!"
      );

      // Immediately refresh the list to show uploaded document info
      await listReports();

      // Set up delayed refresh after 5 seconds to catch any delayed database updates
      setTimeout(async () => {
        console.log("Refreshing document list after 5 seconds...");
        await listReports();
      }, 5000);

      setFile(null);

      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    setFileToDelete(reportId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete || !user || !profile) return;

    try {
      // Get document info from sales_documents_storage with proper filtering
      let query = supabase
        .from("sales_documents_storage")
        .select("document_id, document_path, user_id, brand_id")
        .eq("id", fileToDelete);

      // Brand admins can delete any report from their organization
      // Other users can only delete their own reports
      if (!profile.role_name?.startsWith("brand_admin")) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("brand_id", profile.brand_id);
      }

      const { data: docData, error: docError } = await query.single();

      if (docError) {
        console.error("Error fetching document info:", docError);
        toast.error("Failed to get document information");
        return;
      }

      const documentId = docData.document_id;
      const storagePath = docData.document_path;
      const originalUserId = docData.user_id;

      const salesDataTableName = `sales_documents_${originalUserId.replace(
        /-/g,
        "_"
      )}`;
      console.log("Sales data table name:", salesDataTableName);
      const { error: dataTableError } = await supabase
        .from(salesDataTableName)
        .delete()
        .eq("document_id", documentId);

      if (dataTableError) {
        console.error("Sales data deletion error:", dataTableError);
        toast.error("Failed to delete sales data");
        return;
      }

      // Delete from sales_documents_storage table
      const { error: docTableError } = await supabase
        .from("sales_documents_storage")
        .delete()
        .eq("id", fileToDelete);

      if (docTableError) {
        console.error("Document table deletion error:", docTableError);
        toast.error("Failed to delete document record");
        return;
      }

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        toast.error("Failed to delete file from storage");
        return;
      }

      toast.success("File and all related data deleted successfully!");
      await listReports();
      setDeleteModalOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setFileToDelete(null);
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(filtered.map((r) => r.id));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (
      !confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)
    )
      return;

    try {
      const { data: docsData, error: docsError } = await supabase
        .from("sales_documents_storage")
        .select("id, document_id, document_path")
        .in("id", selectedFiles);

      if (docsError) {
        console.error("Error fetching documents info:", docsError);
        toast.error("Failed to get documents information");
        return;
      }

      const documentIds = docsData.map((doc) => doc.document_id);
      const storagePaths = docsData.map((doc) => doc.document_path);

      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove(storagePaths);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        toast.error("Failed to delete files from storage");
        return;
      }

      const { error: docTableError } = await supabase
        .from("sales_documents_storage")
        .delete()
        .in("id", selectedFiles);

      if (docTableError) {
        console.error("Document table deletion error:", docTableError);
        toast.error("Failed to delete document records");
        return;
      }

      const { error: dataTableError } = await supabase
        .from(`sales_documents_${user?.id.replace(/-/g, "_")}`)
        .delete()
        .in("document_id", documentIds);

      if (dataTableError) {
        console.error("Sales documents deletion error:", dataTableError);
      }

      toast.success(
        `${selectedFiles.length} files and all related data deleted successfully!`
      );
      await listReports();
      setSelectedFiles([]);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete files");
    }
  };

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const uploadDate = new Date(r.uploadedAt).getTime();
      const fromTime = fromDate ? fromDate.getTime() : 0;
      const toTime = toDate ? toDate.getTime() : Infinity;

      const matchesDate = uploadDate >= fromTime && uploadDate <= toTime;
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesSearch;
    });
  }, [reports, fromDate, toDate, searchTerm]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    console.log("useEffect triggered:", {
      user: !!user,
      profile: !!profile,
      userId: user?.id,
      orgId: profile?.brand_id,
      role: profile?.role_name,
    });
    if (user && profile) {
      listReports();
    }
  }, [user?.id, profile?.brand_id, profile?.role_name]);

  const handleTemplateUpload = async (file: File) => {
    // Handle template upload logic here
    console.log("Uploading template file:", file.name);
    // You can implement actual upload logic here
  };

  const handlePreviewFile = (report: UploadedReport) => {
    console.log("Preview file clicked:", report);
    setPreviewFile(report);
    setPreviewDialogOpen(true);
  };

  const closePreviewDialog = () => {
    setPreviewDialogOpen(false);
    setPreviewFile(null);
  };

  const headerActions = (
    <HeaderNotificationButton
      userRole={profile?.role_name || "brand_user"}
      onTemplateUpload={handleTemplateUpload}
    />
  );

  return (
    <MainLayout
      pageTitle="Sales Reports"
      pageSubtitle="Upload and manage your sales data files"
      actions={headerActions}
    >
      <div className="space-y-6">
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Upload className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Upload Sales Reports
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Upload CSV or Excel files with your sales data
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative">
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-teal-400 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      CSV, XLS, XLSX (MAX. 10MB)
                    </p>
                  </div>
                </label>
              </div>

              {file && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <FileText className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-teal-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-teal-600">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        // Clear the file input element
                        const fileInput = document.getElementById(
                          "file-upload"
                        ) as HTMLInputElement;
                        if (fileInput) {
                          fileInput.value = "";
                        }
                      }}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading || !user}
                  className="flex-1 sm:flex-none"
                >
                  {isUploading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload File
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={listReports}
                  disabled={isLoadingList}
                  className="flex-1 sm:flex-none"
                >
                  {isLoadingList ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh List"
                  )}
                </Button>
              </div>

              {!user && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">
                    Please sign in to upload and view your reports.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Uploaded Reports
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {filtered.length} of {reports.length} files
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {reports.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showMobileFilters ? "Hide Filters" : "Show Filters"}
                {(fromDate || toDate || searchTerm) && (
                  <Badge variant="secondary" className="ml-2">
                    {(fromDate ? 1 : 0) +
                      (toDate ? 1 : 0) +
                      (searchTerm ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters */}
            <div
              className={`space-y-4 mb-6 ${
                showMobileFilters ? "block" : "hidden lg:block"
              }`}
            >
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search files
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search by filename, user, company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal pl-10",
                            !fromDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {fromDate
                            ? format(fromDate, "MMM dd, yyyy")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={fromDate}
                          onSelect={setFromDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal pl-10",
                            !toDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {toDate
                            ? format(toDate, "MMM dd, yyyy")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={toDate}
                          onSelect={setToDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {(fromDate || toDate || searchTerm) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFromDate(undefined);
                      setToDate(undefined);
                      setSearchTerm("");
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </Button>
                  <span className="text-sm text-gray-500">
                    Showing {filtered.length} results
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="flex items-center gap-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Grid</span>
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Table</span>
                  </Button>
                </div>

                {filtered.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiles}
                      className="flex items-center gap-2"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Select All</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="flex items-center gap-2"
                    >
                      <Square className="h-4 w-4" />
                      <span className="hidden sm:inline">Clear</span>
                    </Button>
                    {selectedFiles.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span> (
                        {selectedFiles.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500 text-center sm:text-right">
                {filtered.length} of {reports.length} files
              </div>
            </div>

            {isLoadingList ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading reports...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reports found
                </h3>
                <p className="text-gray-500 mb-4">
                  {reports.length === 0
                    ? "You haven't uploaded any sales reports yet."
                    : "No files match your current filters."}
                </p>
                {reports.length === 0 && (
                  <Button onClick={() => setFile(null)} className="mt-2">
                    Upload your first report
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((report) => (
                  <div
                    key={report.id}
                    className={`relative group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
                      selectedFiles.includes(report.id)
                        ? "ring-2 ring-teal-500 bg-teal-50"
                        : ""
                    }`}
                  >
                    <div className="absolute top-3 left-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFileSelection(report.id)}
                        className="h-6 w-6 p-0"
                      >
                        {selectedFiles.includes(report.id) ? (
                          <CheckSquare className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>

                    <div className="text-center pt-6">
                      <div className="text-4xl mb-2">
                        {getFileIcon(report.fileType)}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        {report.fileType}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3
                          className="font-medium text-gray-900 text-sm truncate flex-1"
                          title={report.name}
                        >
                          {report.name}
                        </h3>
                        {profile?.role_name?.startsWith("brand_admin") &&
                          report.user_id !== user?.id && (
                            <Badge variant="outline" className="text-xs ml-2">
                              Other User
                            </Badge>
                          )}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="font-medium text-gray-700">
                          {report.user_name}
                        </div>
                        <div className="text-gray-600">
                          {report.company_name}
                        </div>
                        <div>ID: {report.documentId}</div>
                        <div>
                          {report.size
                            ? formatFileSize(report.size)
                            : "Unknown size"}
                        </div>
                        <div>{formatDate(report.uploadedAt)}</div>
                        {report.description && (
                          <div
                            className="text-gray-600 italic truncate"
                            title={report.description}
                          >
                            "{report.description}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewFile(report)}
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(report.url, "_blank")}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllFiles}
                            className="h-6 w-6 p-0"
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          File
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          User
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Document ID
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((report) => (
                        <tr
                          key={report.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            selectedFiles.includes(report.id)
                              ? "bg-teal-50"
                              : ""
                          }`}
                        >
                          <td className="py-4 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFileSelection(report.id)}
                              className="h-6 w-6 p-0"
                            >
                              {selectedFiles.includes(report.id) ? (
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">
                                {getFileIcon(report.fileType)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    {report.name}
                                  </p>
                                  {profile?.role_name?.startsWith(
                                    "brand_admin"
                                  ) &&
                                    report.user_id !== user?.id && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Other User
                                      </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 uppercase">
                                  {report.fileType}
                                </p>
                                {report.description && (
                                  <p
                                    className="text-xs text-gray-400 italic truncate max-w-xs"
                                    title={report.description}
                                  >
                                    "{report.description}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {report.user_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {report.user_email}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600">
                              {report.company_name}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600 font-mono">
                              {report.documentId}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600">
                              {report.size
                                ? formatFileSize(report.size)
                                : "Unknown"}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600">
                              {formatDate(report.uploadedAt)}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPreviewFile(report);
                                  setPreviewDialogOpen(true);
                                }}
                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(report.url, "_blank")
                                }
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(report.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Table View */}
                <div className="lg:hidden space-y-4">
                  {filtered.map((report) => (
                    <div
                      key={report.id}
                      className={`bg-white border border-gray-200 rounded-lg p-4 ${
                        selectedFiles.includes(report.id)
                          ? "ring-2 ring-teal-500 bg-teal-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFileSelection(report.id)}
                            className="h-6 w-6 p-0"
                          >
                            {selectedFiles.includes(report.id) ? (
                              <CheckSquare className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <div className="text-2xl">
                            {getFileIcon(report.fileType)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewFile(report)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(report.url, "_blank")}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(report.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {report.name}
                          </h3>
                          <p className="text-xs text-gray-500 uppercase">
                            {report.fileType}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">User:</span>
                            <p className="font-medium text-gray-900">
                              {report.user_name}
                            </p>
                            <p className="text-gray-500">{report.user_email}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Company:</span>
                            <p className="font-medium text-gray-900">
                              {report.company_name}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Size:</span>
                            <p className="font-medium text-gray-900">
                              {report.size
                                ? formatFileSize(report.size)
                                : "Unknown"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Uploaded:</span>
                            <p className="font-medium text-gray-900">
                              {formatDate(report.uploadedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs">
                          <span className="text-gray-500">Document ID:</span>
                          <p className="font-mono text-gray-600 break-all">
                            {report.documentId}
                          </p>
                        </div>

                        {report.description && (
                          <div className="text-xs">
                            <span className="text-gray-500">Description:</span>
                            <p className="text-gray-600 italic">
                              "{report.description}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone and will permanently remove the file and all associated
              data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      {previewFile && (
        <FilePreviewDialog
          isOpen={previewDialogOpen}
          onClose={closePreviewDialog}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.fileType}
          fileSize={previewFile.size}
        />
      )}
    </MainLayout>
  );
}
