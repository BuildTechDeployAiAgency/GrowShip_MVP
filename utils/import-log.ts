import { createClient } from "@supabase/supabase-js";
import { ImportLog, ValidationError, ImportType, ImportStatus } from "@/types/import";

/**
 * Create a new import log entry
 */
export async function createImportLog(data: {
  userId: string;
  brandId: string;
  distributorId?: string;
  importType: ImportType;
  fileName: string;
  fileHash: string;
  totalRows: number;
  metadata?: Record<string, any>;
}): Promise<{ id: string; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: insertData, error } = await supabase
    .from("import_logs")
    .insert({
      user_id: data.userId,
      brand_id: data.brandId,
      distributor_id: data.distributorId || null,
      import_type: data.importType,
      file_name: data.fileName,
      file_hash: data.fileHash,
      total_rows: data.totalRows,
      successful_rows: 0,
      failed_rows: 0,
      status: "processing" as ImportStatus,
      metadata: data.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating import log:", error);
    return { id: "", error: error.message };
  }

  return { id: insertData.id };
}

/**
 * Update import log with results
 */
export async function updateImportLog(
  logId: string,
  updates: {
    successfulRows?: number;
    failedRows?: number;
    status?: ImportStatus;
    errorDetails?: ValidationError[];
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.successfulRows !== undefined) {
    updateData.successful_rows = updates.successfulRows;
  }

  if (updates.failedRows !== undefined) {
    updateData.failed_rows = updates.failedRows;
  }

  if (updates.status) {
    updateData.status = updates.status;
    
    // Set completed_at if status is completed or failed
    if (updates.status === "completed" || updates.status === "failed" || updates.status === "partial") {
      updateData.completed_at = new Date().toISOString();
    }
  }

  if (updates.errorDetails) {
    updateData.error_details = updates.errorDetails;
  }

  if (updates.metadata) {
    updateData.metadata = updates.metadata;
  }

  const { error } = await supabase
    .from("import_logs")
    .update(updateData)
    .eq("id", logId);

  if (error) {
    console.error("Error updating import log:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get import log by ID
 */
export async function getImportLog(logId: string): Promise<{
  data?: ImportLog;
  error?: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("import_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (error) {
    console.error("Error getting import log:", error);
    return { error: error.message };
  }

  return { data: data as ImportLog };
}

/**
 * Get import logs for a user
 */
export async function getImportLogsByUser(
  userId: string,
  importType?: ImportType,
  limit: number = 50
): Promise<{
  data?: ImportLog[];
  error?: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("import_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (importType) {
    query = query.eq("import_type", importType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getting import logs:", error);
    return { error: error.message };
  }

  return { data: data as ImportLog[] };
}

/**
 * Get import logs for a brand
 */
export async function getImportLogsByBrand(
  brandId: string,
  importType?: ImportType,
  limit: number = 100
): Promise<{
  data?: ImportLog[];
  error?: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("import_logs")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (importType) {
    query = query.eq("import_type", importType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error getting import logs:", error);
    return { error: error.message };
  }

  return { data: data as ImportLog[] };
}

/**
 * Get import statistics
 */
export async function getImportStatistics(
  brandId: string,
  importType: ImportType = "orders",
  days: number = 30
): Promise<{
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  totalRowsProcessed: number;
  totalRowsSuccessful: number;
  totalRowsFailed: number;
  error?: string;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("import_logs")
    .select("status, total_rows, successful_rows, failed_rows")
    .eq("brand_id", brandId)
    .eq("import_type", importType)
    .gte("created_at", startDate.toISOString());

  if (error) {
    console.error("Error getting import statistics:", error);
    return {
      totalImports: 0,
      successfulImports: 0,
      failedImports: 0,
      totalRowsProcessed: 0,
      totalRowsSuccessful: 0,
      totalRowsFailed: 0,
      error: error.message,
    };
  }

  const stats = {
    totalImports: data.length,
    successfulImports: data.filter((log) => log.status === "completed").length,
    failedImports: data.filter((log) => log.status === "failed").length,
    totalRowsProcessed: data.reduce((sum, log) => sum + log.total_rows, 0),
    totalRowsSuccessful: data.reduce((sum, log) => sum + log.successful_rows, 0),
    totalRowsFailed: data.reduce((sum, log) => sum + log.failed_rows, 0),
  };

  return stats;
}

