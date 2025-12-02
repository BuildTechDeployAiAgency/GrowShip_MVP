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

interface MenuEntry {
  parent_id: string | null;
  menu_label: string;
  menu_icon: string;
  route_path: string;
  menu_order: number;
  is_active: boolean;
  requires_permission: string | null;
}

const menuEntries: MenuEntry[] = [
  // Dashboard (always accessible)
  {
    parent_id: null,
    menu_label: "Dashboard",
    menu_icon: "LayoutDashboard",
    route_path: "/dashboard",
    menu_order: 1,
    is_active: true,
    requires_permission: null,
  },
  // Sales (parent menu)
  {
    parent_id: null,
    menu_label: "Sales",
    menu_icon: "DollarSign",
    route_path: "/sales",
    menu_order: 2,
    is_active: true,
    requires_permission: "view_sales",
  },
  // Users
  {
    parent_id: null,
    menu_label: "Users",
    menu_icon: "Users",
    route_path: "/users",
    menu_order: 3,
    is_active: true,
    requires_permission: "view_users",
  },
  // Settings
  {
    parent_id: null,
    menu_label: "Settings",
    menu_icon: "Settings",
    route_path: "/settings",
    menu_order: 4,
    is_active: true,
    requires_permission: null,
  },
  // Super Admin
  {
    parent_id: null,
    menu_label: "Super Admin",
    menu_icon: "Users2",
    route_path: "/super-admin",
    menu_order: 5,
    is_active: true,
    requires_permission: "super_admin",
  },
];

async function addMenuEntries() {
  console.log("?? Starting to add menu entries...\n");

  try {
    // First, insert all parent menus
    const parentMenus = menuEntries.filter((menu) => menu.parent_id === null);
    const parentMenuMap = new Map<string, string>(); // menu_label -> id

    for (const menu of parentMenus) {
      // Check if menu already exists
      const { data: existing } = await supabase
        .from("sidebar_menus")
        .select("id")
        .eq("route_path", menu.route_path)
        .single();

      if (existing) {
        console.log(`??  Menu "${menu.menu_label}" already exists, skipping...`);
        parentMenuMap.set(menu.menu_label, existing.id);
        continue;
      }

      const { data, error } = await supabase
        .from("sidebar_menus")
        .insert({
          parent_id: null,
          menu_label: menu.menu_label,
          menu_icon: menu.menu_icon,
          route_path: menu.route_path,
          menu_order: menu.menu_order,
          is_active: menu.is_active,
          requires_permission: menu.requires_permission,
        })
        .select("id")
        .single();

      if (error) {
        console.error(`? Error adding menu "${menu.menu_label}":`, error.message);
        continue;
      }

      console.log(`? Added menu: "${menu.menu_label}" (${menu.route_path})`);
      if (data) {
        parentMenuMap.set(menu.menu_label, data.id);
      }
    }

    // Now add child menus (Sales Analytics and Reports)
    const salesMenuId = parentMenuMap.get("Sales");
    if (salesMenuId) {
      const childMenus: MenuEntry[] = [
        {
          parent_id: salesMenuId,
          menu_label: "Analytics",
          menu_icon: "BarChart3",
          route_path: "/sales/analytics",
          menu_order: 1,
          is_active: true,
          requires_permission: "view_sales",
        },
        {
          parent_id: salesMenuId,
          menu_label: "Reports",
          menu_icon: "FileText",
          route_path: "/sales/reports",
          menu_order: 2,
          is_active: true,
          requires_permission: "view_sales",
        },
      ];

      for (const childMenu of childMenus) {
        // Check if child menu already exists
        const { data: existing } = await supabase
          .from("sidebar_menus")
          .select("id")
          .eq("route_path", childMenu.route_path)
          .single();

        if (existing) {
          console.log(`??  Menu "${childMenu.menu_label}" already exists, skipping...`);
          continue;
        }

        const { error } = await supabase.from("sidebar_menus").insert({
          parent_id: childMenu.parent_id,
          menu_label: childMenu.menu_label,
          menu_icon: childMenu.menu_icon,
          route_path: childMenu.route_path,
          menu_order: childMenu.menu_order,
          is_active: childMenu.is_active,
          requires_permission: childMenu.requires_permission,
        });

        if (error) {
          console.error(
            `? Error adding child menu "${childMenu.menu_label}":`,
            error.message
          );
        } else {
          console.log(
            `? Added child menu: "${childMenu.menu_label}" (${childMenu.route_path})`
          );
        }
      }
    }

    console.log("\n? Menu entries added successfully!");
  } catch (error) {
    console.error("? Fatal error:", error);
    process.exit(1);
  }
}

addMenuEntries();
