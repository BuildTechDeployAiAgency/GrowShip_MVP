import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables - try multiple locations
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`?? Loaded environment from: ${envPath}`);
    break;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("? Missing required environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\n?? Make sure .env.local is configured correctly.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface RolePermission {
  role_name: string;
  menu_paths: string[];
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_approve: boolean;
  };
}

// Define which roles should have access to which menus
const rolePermissions: RolePermission[] = [
  // Super Admin - full access to everything
  {
    role_name: "super_admin",
    menu_paths: [
      "/dashboard",
      "/sales",
      "/sales/analytics",
      "/sales/reports",
      "/users",
      "/settings",
      "/super-admin",
    ],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: true,
      can_approve: true,
    },
  },
  // Brand roles
  {
    role_name: "brand_owner",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "brand_admin",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/users", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "brand_manager",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "brand_user",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/settings"],
    permissions: {
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_approve: false,
    },
  },
  // Distributor roles
  {
    role_name: "distributor_owner",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "distributor_admin",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/users", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "distributor_manager",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "distributor_user",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/settings"],
    permissions: {
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_approve: false,
    },
  },
  // Manufacturer roles
  {
    role_name: "manufacturer_owner",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "manufacturer_admin",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/users", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "manufacturer_manager",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/sales/reports", "/settings"],
    permissions: {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_approve: false,
    },
  },
  {
    role_name: "manufacturer_user",
    menu_paths: ["/dashboard", "/sales", "/sales/analytics", "/settings"],
    permissions: {
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_approve: false,
    },
  },
];

async function assignMenuPermissions() {
  console.log("?? Starting to assign menu permissions...\n");

  try {
    // Get all roles from database
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, role_name")
      .eq("is_active", true);

    if (rolesError) {
      console.error("? Error fetching roles:", rolesError.message);
      process.exit(1);
    }

    if (!roles || roles.length === 0) {
      console.error("? No active roles found in database.");
      console.error("   Please ensure roles are created first.");
      process.exit(1);
    }

    console.log(`?? Found ${roles.length} active roles\n`);

    // Get all menus
    const { data: menus, error: menusError } = await supabase
      .from("sidebar_menus")
      .select("id, route_path")
      .eq("is_active", true);

    if (menusError) {
      console.error("? Error fetching menus:", menusError.message);
      process.exit(1);
    }

    if (!menus || menus.length === 0) {
      console.error("? No active menus found in database.");
      console.error("   Please run add-menu-entries.ts first.");
      process.exit(1);
    }

    console.log(`?? Found ${menus.length} active menus\n`);

    // Create a map of route_path -> menu_id
    const menuMap = new Map<string, string>();
    menus.forEach((menu) => {
      menuMap.set(menu.route_path, menu.id);
    });

    // Process each role
    for (const rolePerm of rolePermissions) {
      const role = roles.find((r) => r.role_name === rolePerm.role_name);

      if (!role) {
        console.log(`??  Role "${rolePerm.role_name}" not found in database, skipping...`);
        continue;
      }

      console.log(`\n?? Processing role: ${rolePerm.role_name}`);

      // Get existing permissions for this role
      const { data: existingPermissions } = await supabase
        .from("role_menu_permissions")
        .select("menu_id")
        .eq("role_id", role.id);

      const existingMenuIds = new Set(
        existingPermissions?.map((p) => p.menu_id) || []
      );

      let added = 0;
      let skipped = 0;

      // Assign permissions for each menu path
      for (const menuPath of rolePerm.menu_paths) {
        const menuId = menuMap.get(menuPath);

        if (!menuId) {
          console.log(`   ??  Menu not found: ${menuPath}`);
          continue;
        }

        // Skip if permission already exists
        if (existingMenuIds.has(menuId)) {
          skipped++;
          continue;
        }

        const { error } = await supabase.from("role_menu_permissions").insert({
          role_id: role.id,
          menu_id: menuId,
          can_view: rolePerm.permissions.can_view,
          can_edit: rolePerm.permissions.can_edit,
          can_delete: rolePerm.permissions.can_delete,
          can_approve: rolePerm.permissions.can_approve,
        });

        if (error) {
          console.error(`   ? Error assigning permission for ${menuPath}:`, error.message);
        } else {
          console.log(`   ? Assigned permissions for: ${menuPath}`);
          added++;
        }
      }

      console.log(`   ?? Added: ${added}, Skipped: ${skipped}`);
    }

    console.log("\n? Menu permissions assigned successfully!");
  } catch (error) {
    console.error("? Fatal error:", error);
    process.exit(1);
  }
}

assignMenuPermissions();
