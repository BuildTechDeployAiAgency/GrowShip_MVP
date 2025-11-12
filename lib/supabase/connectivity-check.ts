/**
 * Utility functions to check Supabase connectivity and verify RPC functions exist
 */

import { createClient } from "@/lib/supabase/client";

export interface ConnectivityStatus {
  connected: boolean;
  error?: string;
  message: string;
}

/**
 * Check if Supabase connection is working by performing a simple query
 */
export async function checkSupabaseConnectivity(): Promise<ConnectivityStatus> {
  try {
    const supabase = createClient();
    
    // Try a simple query to verify connection
    const { data, error } = await supabase
      .from("user_profiles")
      .select("count")
      .limit(1);

    if (error) {
      return {
        connected: false,
        error: error.message,
        message: `Connection failed: ${error.message}`,
      };
    }

    return {
      connected: true,
      message: "Successfully connected to Supabase",
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to connect to Supabase",
    };
  }
}

/**
 * Check if a specific RPC function exists in the database
 */
export async function checkRpcFunctionExists(
  functionName: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    // Try calling the function with minimal/null parameters
    // If it doesn't exist, we'll get a specific error
    const { error } = await supabase.rpc(functionName, {});

    if (error) {
      const isFunctionNotFound = 
        error.code === "P0004" || 
        error.message?.includes("Could not find the function") ||
        error.message?.includes("does not exist") ||
        error.code === "42883";

      if (isFunctionNotFound) {
        return {
          exists: false,
          error: `Function '${functionName}' not found in database`,
        };
      }

      // Other errors might mean the function exists but parameters are wrong
      // In that case, we assume it exists
      return {
        exists: true,
      };
    }

    return {
      exists: true,
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check multiple RPC functions at once
 */
export async function checkMultipleRpcFunctions(
  functionNames: string[]
): Promise<Record<string, { exists: boolean; error?: string }>> {
  const results: Record<string, { exists: boolean; error?: string }> = {};

  await Promise.all(
    functionNames.map(async (name) => {
      results[name] = await checkRpcFunctionExists(name);
    })
  );

  return results;
}

