// Environment Check Script
// Run this to verify your Supabase configuration

import { createAdminClient } from "@/lib/supabase/server";

export async function checkSupabaseConfig() {
  console.log("🔍 Checking Supabase Configuration...");

  // Check environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error("❌ Missing environment variables:", missingVars);
    return false;
  }

  console.log("✅ All required environment variables are set");

  // Test admin client connection
  try {
    const adminClient = createAdminClient();

    // Test a simple query to verify the service role key works
    const { data, error } = await adminClient
      .from("user_profiles")
      .select("count")
      .limit(1);

    if (error) {
      console.error("❌ Admin client test failed:", error.message);
      return false;
    }

    console.log("✅ Admin client connection successful");
    return true;
  } catch (error) {
    console.error("❌ Admin client creation failed:", error);
    return false;
  }
}

// Usage: Call this function to check your configuration
// checkSupabaseConfig().then(result => {
//   console.log("Configuration check result:", result);
// });
