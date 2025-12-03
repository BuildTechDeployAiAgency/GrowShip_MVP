const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Load environment variables from .env.local
let env = {};
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const envLines = envContent.split("\n");
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=");
      env[key.trim()] = value.replace(/['"]/g, "").trim();
    }
  });
} catch (e) {
  console.error("Could not read .env.local");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMenuPermissions() {
  console.log("Checking menu permissions for distributor_admin...");

  // 1. Get role id for distributor_admin
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("role_name", "distributor_admin")
    .single();

  if (roleError) {
    console.error("Error finding role:", roleError);
    return;
  }

  console.log("Role ID for distributor_admin:", role.id);

  // 2. Get menu id for Purchase Orders
  const { data: menu, error: menuError } = await supabase
    .from("sidebar_menus")
    .select("id, menu_label, route_path, is_active")
    .eq("menu_label", "Purchase Orders")
    .single();

  if (menuError) {
    console.error("Error finding Purchase Orders menu:", menuError);
    
    // List all menus to see what's available
    const { data: allMenus } = await supabase.from("sidebar_menus").select("menu_label, route_path");
    console.log("Available menus:", allMenus.map(m => m.menu_label).join(", "));
    return;
  }

  console.log("Menu found:", menu);

  // 3. Check permission
  const { data: permission, error: permError } = await supabase
    .from("role_menu_permissions")
    .select("*")
    .eq("role_id", role.id)
    .eq("menu_id", menu.id);

  if (permError) {
    console.error("Error checking permission:", permError);
  } else {
    console.log("Permission record:", permission);
  }
  
  // 4. Check user profile for isabellarxpedro@gmail.com
  const { data: user, error: userError } = await supabase
    .from("user_profiles")
    .select("role_name, email")
    .eq("email", "isabellarxpedro@gmail.com")
    .single();
    
  if (userError) {
      console.log("User error:", userError);
  } else {
      console.log("User profile:", user);
  }
}

checkMenuPermissions()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });

