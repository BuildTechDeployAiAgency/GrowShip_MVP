// Verify super admin profile state
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

async function verifySuperAdmin() {
  console.log("Verifying super admin profile...\n");

  const { data: superAdmin, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("email", "diogo@diogoppedro.com")
    .single();

  if (error) {
    console.log("❌ Error finding super admin:", error);
    return;
  }

  console.log("Super Admin Profile:");
  console.log(JSON.stringify(superAdmin, null, 2));

  console.log("\n--- Verification ---");
  console.log(`role_name: ${superAdmin.role_name} (expected: "super_admin")`);
  console.log(`role_type: ${superAdmin.role_type} (expected: "super_admin")`);
  
  const roleNameCorrect = superAdmin.role_name === "super_admin";
  const roleTypeCorrect = superAdmin.role_type === "super_admin";
  
  if (roleNameCorrect && roleTypeCorrect) {
    console.log("\n✅ Super admin profile is correctly configured!");
  } else {
    console.log("\n❌ Super admin profile needs correction:");
    if (!roleNameCorrect) {
      console.log(`  - role_name should be "super_admin" but is "${superAdmin.role_name}"`);
    }
    if (!roleTypeCorrect) {
      console.log(`  - role_type should be "super_admin" but is "${superAdmin.role_type}"`);
    }
    
    console.log("\nWould you like to fix this? (Manual SQL update needed)");
    console.log(`UPDATE user_profiles SET role_name = 'super_admin', role_type = 'super_admin' WHERE email = 'diogo@diogoppedro.com';`);
  }
}

verifySuperAdmin()
  .then(() => {
    console.log("\nVerification complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script error:", error);
    process.exit(1);
  });
