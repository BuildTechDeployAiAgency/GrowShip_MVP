"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image,
  File,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePaymentAttachments } from "@/hooks/use-payment-lines";
import { PaymentAttachment } from "@/types/payment-lines";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";

interface AttachmentsManagerProps {
  invoiceId: string;
  paymentLineId: string;
  canUpload?: boolean;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return Image;
  }
  if (fileType === "application/pdf") {
    return FileText;
  }
  return File;
};

const formatFileSize = (bytes: number): string => {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
};

export function AttachmentsManager({ 
  invoiceId, 
  paymentLineId, 
  canUpload = false 
}: AttachmentsManagerProps) {
  const { attachments, loading, uploadAttachment, downloadAttachment, deleteAttachment } = 
    usePaymentAttachments(invoiceId, paymentLineId);
  
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png", 
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" is not a supported format. Only images, PDFs, and Word documents are allowed.`);
        continue;
      }

      try {
        setIsUploading(true);
        await uploadAttachment(invoiceId, paymentLineId, file);
      } catch (error) {
        console.error("Error uploading file:", error);
        // Error toast is handled by the hook
      }
    }
    
    setIsUploading(false);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (!canUpload) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDownload = async (attachment: PaymentAttachment) => {
    try {
      const downloadData = await downloadAttachment(invoiceId, paymentLineId, attachment.id);
      
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadData.downloadUrl;
      link.download = downloadData.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      // Error toast is handled by the hook
    }
  };

  const handleDelete = async (attachment: PaymentAttachment) => {
    if (!window.confirm(`Are you sure you want to delete "${attachment.file_name}"?`)) {
      return;
    }

    try {
      await deleteAttachment(invoiceId, paymentLineId, attachment.id);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      // Error toast is handled by the hook
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
        <div className="text-sm text-gray-500 mt-2">Loading attachments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Payment Proof Attachments</h4>
        {canUpload && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Add Files"}
          </Button>
        )}
      </div>

      {/* File Input */}
      {canUpload && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      )}

      {/* Drag & Drop Area */}
      {canUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragOver 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-300 hover:border-gray-400",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <div className="text-sm text-gray-600">
            <p>Drag and drop files here, or click "Add Files" above</p>
            <p className="text-xs text-gray-500 mt-1">
              Supports: Images, PDFs, Word docs • Max 10MB per file
            </p>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No attachments uploaded yet</p>
          {canUpload && (
            <p className="text-xs text-gray-400">Upload receipts, confirmations, or other proof of payment</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              canDelete={canUpload}
              onDownload={() => handleDownload(attachment)}
              onDelete={() => handleDelete(attachment)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AttachmentCardProps {
  attachment: PaymentAttachment;
  canDelete: boolean;
  onDownload: () => void;
  onDelete: () => void;
}

function AttachmentCard({ attachment, canDelete, onDownload, onDelete }: AttachmentCardProps) {
  const FileIcon = getFileIcon(attachment.file_type);
  const isImage = attachment.file_type.startsWith("image/");

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "flex-shrink-0 p-2 rounded-lg",
              isImage ? "bg-green-100" : "bg-blue-100"
            )}>
              <FileIcon className={cn(
                "h-5 w-5",
                isImage ? "text-green-600" : "text-blue-600"
              )} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {attachment.file_name}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatFileSize(attachment.file_size)}</span>
                <span>•</span>
                <span>
                  {new Date(attachment.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              onClick={onDownload}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {canDelete && (
              <Button
                onClick={onDelete}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}