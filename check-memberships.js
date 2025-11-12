// Check memberships for all users
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

async function checkMemberships() {
  console.log("Checking user memberships...\n");

  // Get all user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, email, role_name, role_type, brand_id");

  if (profilesError) {
    console.log("Error getting profiles:", profilesError);
    return;
  }

  console.log("All user profiles:");
  profiles.forEach(profile => {
    console.log(`- ${profile.email}: role=${profile.role_name}, brand_id=${profile.brand_id}`);
  });

  console.log("\nChecking memberships:");
  for (const profile of profiles) {
    const { data: memberships, error: membershipError } = await supabase
      .from("user_memberships")
      .select("*")
      .eq("user_id", profile.user_id);

    if (membershipError) {
      console.log(`Error getting memberships for ${profile.email}:`, membershipError);
    } else {
      console.log(`${profile.email} memberships:`, memberships.length);
      memberships.forEach(membership => {
        console.log(`  - brand_id: ${membership.brand_id}, role: ${membership.role_name}, active: ${membership.is_active}`);
      });
    }
  }
}

checkMemberships()
  .then(() => {
    console.log("\nMembership check complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script error:", error);
    process.exit(1);
  });
