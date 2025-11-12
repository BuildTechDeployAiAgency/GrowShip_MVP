// Test script for users API functionality
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Load environment variables
const envContent = fs.readFileSync(".env.local", "utf8");
const envLines = envContent.split("\n");
const env = {};

envLines.forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    const value = valueParts.join("=");
    env[key.trim()] = value.replace(/['"]/g, "").trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Test different user roles and see what they can access
async function testUserAccess() {
  console.log("Testing user access with different roles...\n");

  // Test 1: Check if we can query user_profiles directly (this should fail due to RLS)
  console.log("Test 1: Direct query to user_profiles (should fail for anon user)");
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("email, role_name, user_status")
      .limit(5);

    if (error) {
      console.log("✅ Expected error:", error.message);
    } else {
      console.log("❌ Unexpected success, got data:", data);
    }
  } catch (err) {
    console.log("Error:", err.message);
  }

  // Test 2: Check if super admin policy works
  console.log("\nTest 2: Check super admin user exists and has correct role");
  const { data: superAdmin, error: saError } = await supabase
    .from("user_profiles")
    .select("email, role_name, role_type, user_status, brand_id")
    .eq("role_name", "super_admin")
    .single();

  if (saError) {
    console.log("❌ Error finding super admin:", saError.message);
  } else {
    console.log("✅ Super admin found:", JSON.stringify(superAdmin, null, 2));
  }

  // Test 3: Check sample users exist
  console.log("\nTest 3: Check sample users");
  const emails = ["noahjxpedro@gmail.com", "diogoppedro@gmail.com", "isabellarxpedro@gmail.com"];

  for (const email of emails) {
    const { data: user, error } = await supabase
      .from("user_profiles")
      .select("email, role_name, user_status, brand_id")
      .eq("email", email)
      .single();

    if (error) {
      console.log(`❌ ${email}: Not found or error - ${error.message}`);
    } else {
      console.log(`✅ ${email}: ${JSON.stringify(user)}`);
    }
  }

  // Test 4: Check brands table
  console.log("\nTest 4: Check brands table");
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("id, name, organization_type")
    .limit(10);

  if (brandsError) {
    console.log("❌ Error querying brands:", brandsError.message);
  } else {
    console.log("✅ Brands found:", JSON.stringify(brands, null, 2));
  }
}

testUserAccess()
  .then(() => {
    console.log("\nAPI testing complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script error:", error);
    process.exit(1);
  });
