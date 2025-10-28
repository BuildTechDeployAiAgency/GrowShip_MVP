import { createClient } from "./client";

const BUCKET_NAME = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface AvatarUploadResult {
  url: string;
  path: string;
  error?: string;
}

export interface AvatarUploadError {
  message: string;
  code?: string;
}

export function validateAvatarFile(file: File): AvatarUploadError | null {
  if (!file) {
    return { message: "No file selected" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      code: "FILE_TOO_LARGE",
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      message: "Only JPEG, PNG, WebP, and GIF images are allowed",
      code: "INVALID_FILE_TYPE",
    };
  }

  return null;
}

export function generateAvatarFileName(
  userId: string,
  fileExtension: string
): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${userId}/${timestamp}-${randomString}${fileExtension}`;
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<AvatarUploadResult> {
  const supabase = createClient();

  try {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      return { url: "", path: "", error: validationError.message };
    }

    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = generateAvatarFileName(userId, `.${fileExtension}`);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Avatar upload error:", error);
      return {
        url: "",
        path: "",
        error: error.message || "Failed to upload avatar",
      };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error: any) {
    console.error("Avatar upload error:", error);
    return {
      url: "",
      path: "",
      error: error.message || "Failed to upload avatar",
    };
  }
}

export async function deleteAvatar(
  filePath: string
): Promise<{ error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Avatar deletion error:", error);
      return { error: error.message || "Failed to delete avatar" };
    }

    return {};
  } catch (error: any) {
    console.error("Avatar deletion error:", error);
    return { error: error.message || "Failed to delete avatar" };
  }
}

export function getAvatarUrl(filePath: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return data.publicUrl;
}

export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
