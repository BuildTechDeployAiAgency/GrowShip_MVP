// Temporary script to inspect sample users
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Load environment variables from .env.local
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

async function checkUsers() {
  console.log("Checking sample users...");

  const emails = ["noahjxpedro@gmail.com", "diogoppedro@gmail.com", "isabellarxpedro@gmail.com"];

  for (const email of emails) {
    console.log(`\n--- Checking user: ${email} ---`);

    // Check user_profiles
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email);

    if (profileError) {
      console.log("Profile error:", profileError.message);
      continue;
    }

    if (profiles && profiles.length > 0) {
      console.log("Profile found:");
      console.log(JSON.stringify(profiles[0], null, 2));

      // Check user_memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("user_memberships")
        .select("*")
        .eq("user_id", profiles[0].user_id);

      if (membershipError) {
        console.log("Membership error:", membershipError.message);
      } else {
        console.log("Memberships:");
        console.log(JSON.stringify(memberships, null, 2));
      }
    } else {
      console.log("No profile found");
    }
  }

  // Also check total user count and see what super admin users exist
  console.log("\n--- Checking super admin users ---");
  const { data: superAdmins, error: saError } = await supabase
    .from("user_profiles")
    .select("email, role_name, user_status, brand_id")
    .eq("role_name", "super_admin");

  if (saError) {
    console.log("Super admin query error:", saError.message);
  } else {
    console.log("Super admin users:", JSON.stringify(superAdmins, null, 2));
  }

  console.log("\n--- Checking total user count ---");
  const { count, error: countError } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.log("Count error:", countError.message);
  } else {
    console.log("Total users:", count);
  }
}

checkUsers()
  .then(() => {
    console.log("\nInspection complete");
    process.exit(0);
  })
  .catch(error => {
    console.error("Script error:", error);
    process.exit(1);
  });
