import { createClient } from "@supabase/supabase-js";

/**
 * Generate SHA-256 hash from file buffer
 */
export async function generateFileHash(fileBuffer: Buffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Generate SHA-256 hash from File object (browser)
 */
export async function generateFileHashFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Check if import with this file hash exists (within last 24 hours)
 */
export async function checkImportExists(
  fileHash: string,
  brandId: string,
  importType: string = "orders"
): Promise<{
  exists: boolean;
  importLog?: any;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check for imports with same hash in last 24 hours
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data, error } = await supabase
    .from("import_logs")
    .select("*")
    .eq("file_hash", fileHash)
    .eq("brand_id", brandId)
    .eq("import_type", importType)
    .gte("created_at", twentyFourHoursAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error checking import exists:", error);
    return { exists: false };
  }

  return {
    exists: data.length > 0,
    importLog: data[0],
  };
}

/**
 * Check if import is a duplicate and get the previous import info
 */
export async function checkDuplicateImport(
  fileHash: string,
  brandId: string,
  userId: string,
  importType: string = "orders"
): Promise<{
  isDuplicate: boolean;
  previousImport?: {
    id: string;
    created_at: string;
    status: string;
    total_rows: number;
    successful_rows: number;
    failed_rows: number;
  };
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check for completed imports with same hash in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("import_logs")
    .select("id, created_at, status, total_rows, successful_rows, failed_rows")
    .eq("file_hash", fileHash)
    .eq("brand_id", brandId)
    .eq("import_type", importType)
    .eq("status", "completed")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error checking duplicate import:", error);
    return { isDuplicate: false };
  }

  return {
    isDuplicate: data.length > 0,
    previousImport: data[0],
  };
}

