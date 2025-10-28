"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Loader2, Edit3, User } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/auth-context";
import {
  createPreviewUrl,
  revokePreviewUrl,
  validateAvatarFile,
} from "@/lib/supabase/avatar";

interface AvatarUploadProps {
  currentAvatar?: string;
  userName?: string;
  onAvatarChange?: (newAvatarUrl: string) => void;
  size?: "sm" | "md" | "lg";
  showUploadArea?: boolean;
}

export function AvatarUpload({
  currentAvatar,
  userName = "User",
  onAvatarChange,
  size = "md",
  showUploadArea = false,
}: AvatarUploadProps) {
  const { uploadAvatar } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validationError = validateAvatarFile(file);
      if (validationError) {
        toast.error(validationError.message);
        return;
      }

      const preview = createPreviewUrl(file);
      setPreviewUrl(preview);

      setIsUploading(true);
      try {
        const { error, url } = await uploadAvatar(file);

        if (error) {
          toast.error(error);
          setPreviewUrl(null);
          revokePreviewUrl(preview);
        } else {
          toast.success("Avatar updated successfully!");
          onAvatarChange?.(url!);
          setPreviewUrl(null);
          revokePreviewUrl(preview);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to upload avatar");
        setPreviewUrl(null);
        revokePreviewUrl(preview);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadAvatar, onAvatarChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePreview = () => {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative group">
        <div
          className={`${
            sizeClasses[size]
          } rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
            dragActive ? "ring-4 ring-purple-400 ring-opacity-60 scale-105" : ""
          } ${isUploading ? "animate-pulse" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={`${userName}'s avatar`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/80">
              <User className={`${iconSizes[size]} mb-1`} />
              <span className="text-xs font-medium opacity-70">Add Photo</span>
            </div>
          )}

          {isHovered && !isUploading && displayAvatar && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center rounded-full transition-all duration-300">
              <div className="flex items-center justify-center mb-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                <Edit3 className="w-3 h-3 text-white mr-1" />
                <span className="text-xs font-medium text-white">Edit</span>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/80 to-purple-600/80 backdrop-blur-sm flex items-center justify-center rounded-full">
              <div className="flex flex-col items-center text-white">
                <Loader2 className={`${iconSizes[size]} animate-spin mb-2`} />
                <span className="text-xs font-medium animate-pulse">
                  Uploading...
                </span>
              </div>
            </div>
          )}

          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove avatar"
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:scale-110 transition-all duration-200 p-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePreview();
              }}
            >
              <X className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors" />
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {showUploadArea && (
        <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg border border-gray-200/50 w-full max-w-sm backdrop-blur-sm">
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${
                dragActive
                  ? "border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 scale-105"
                  : "border-gray-300 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-50/50 hover:to-pink-50/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mb-3">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-ping opacity-20"></div>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Uploading your photo...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Drag and drop your image here
                  </p>
                  <p className="text-xs text-gray-500 mb-4">or</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleButtonClick}
                    disabled={isUploading}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
              <p className="font-medium">
                Supported formats: JPEG, PNG, WebP, GIF
              </p>
              <p>Maximum file size: 5MB</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
