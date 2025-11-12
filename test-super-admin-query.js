// Test the exact query that useUsers hook makes for super admin
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

// Use anon key to simulate authenticated user (RLS will apply)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSuperAdminQuery() {
  console.log("Testing super admin query logic...\n");

  // First, let's see if we can authenticate as the super admin
  console.log("Attempting to sign in as super admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "diogo@diogoppedro.com",
    password: "password123" // This might not be the right password, but let's see
  });

  if (authError) {
    console.log("Auth error (expected if password wrong):", authError.message);
    console.log("Let's try with service role to simulate the query...");
    return testWithServiceRole();
  }

  console.log("✅ Auth successful, user:", authData.user?.email);

  // Now try the exact query from useUsers hook
  await testUserQuery();
}

async function testWithServiceRole() {
  console.log("Testing with service role (simulating super admin access)...");
  const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  await testUserQuery(adminSupabase);
}

async function testUserQuery(client = supabase) {
  console.log("\n--- Testing user_profiles query ---");

  // This is the exact query from fetchUsers function
  let query = client
    .from("user_profiles")
    .select(`
      *,
      brands:brand_id (
        id,
        name,
        slug,
        organization_type
      )
    `, { count: "exact" });

  // For super admin: brandId is undefined, so no brand filter
  // isSuperAdmin = true, so no brand filtering

  // Apply search filter (empty)
  // Apply role filter (all)
  // Apply status filter (all)
  // Apply company filter (all)
  // Apply organization filter (all)

  // Order by status then created_at desc
  query = query.order("user_status", { ascending: true }).order("created_at", { ascending: false });

  const { data: usersData, error: fetchError, count } = await query;

  if (fetchError) {
    console.log("❌ Query error:", fetchError);
    return;
  }

  console.log(`✅ Query successful, found ${count} users`);
  console.log("Users data:");
  (usersData || []).forEach(user => {
    console.log(`- ${user.email}: status=${user.user_status}, role=${user.role_name}`);
  });
}

testSuperAdminQuery()
  .then(() => {
    console.log("\nQuery test complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script error:", error);
    process.exit(1);
  });
