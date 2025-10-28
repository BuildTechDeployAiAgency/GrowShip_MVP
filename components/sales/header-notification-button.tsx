"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  Settings,
  Sparkles,
  Clock,
  Users,
  Database,
  CheckCircle,
} from "lucide-react";
import { TemplateModal } from "./template-modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { toast } from "react-toastify";

interface HeaderNotificationButtonProps {
  userRole: string;
  onTemplateUpload?: (file: File) => void;
}

interface TemplateInfo {
  id: string;
  template_name: string;
  version_number: number;
  file_name: string;
  file_path: string;
  description: string;
  required_columns: string[];
  created_at: string;
}

export function HeaderNotificationButton({
  userRole,
  onTemplateUpload,
}: HeaderNotificationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const supabase = createClient();
  const isBrandAdmin = userRole === "brand_admin";

  const handleDownloadTemplate = async () => {
    try {
      // Get file from Supabase Storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from("template")
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

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 w-9 rounded-full border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-all duration-300 hover:scale-105 hover:shadow-lg group"
          >
            <Bell className="h-4 w-4 text-amber-600 group-hover:animate-pulse transition-all duration-300" />
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-bounce bg-gradient-to-r from-red-500 to-pink-500 shadow-lg"
            >
              !
            </Badge>
            {/* Animated ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-300 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-96 p-0 bg-white/95 backdrop-blur-sm border-amber-200 shadow-xl rounded-xl overflow-hidden"
          sideOffset={8}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 text-lg">
                  Template Required
                </h3>
                <p className="text-sm text-amber-600">
                  Standardized data import format
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs bg-amber-100 text-amber-800 border-amber-300 font-semibold"
              >
                Important
              </Badge>
            </div>
          </div>

          {/* Description */}
          <div className="p-4">
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Use our standardized Excel template to ensure accurate data
              extraction and prevent processing errors. The template includes
              all required columns for proper data import.
            </p>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuItem
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  View Template Details
                </div>
                <div className="text-xs text-gray-500">
                  Learn about required columns
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleDownloadTemplate}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-green-50 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Download Template
                </div>
                <div className="text-xs text-gray-500">
                  Get Template.xlsx file
                </div>
              </div>
            </DropdownMenuItem>

            {isBrandAdmin && (
              <>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 rounded-md transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Upload Template
                    </div>
                    <div className="text-xs text-gray-500">
                      Replace default template
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Admin
                  </Badge>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="my-2" />

            <div className="px-2 py-1">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Settings className="w-3 h-3" />
                <span>Template helps prevent data extraction errors</span>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userRole={userRole}
        onTemplateUpload={onTemplateUpload}
      />
    </>
  );
}
