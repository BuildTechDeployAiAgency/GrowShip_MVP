import { createClient } from "@/lib/supabase/server";
import { MenuItem } from "@/types/menu";

/**
 * Server-side menu permissions fetcher for SSR
 * Use in Server Components only
 */
export async function fetchUserMenuPermissionsServer(
  userId: string
): Promise<{
  menuItems: MenuItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role_name")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      return {
        menuItems: [],
        error: `Failed to fetch user profile: ${profileError.message}`,
      };
    }

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("role_name", profile.role_name)
      .eq("is_active", true)
      .single();

    if (roleError) {
      return {
        menuItems: [],
        error: `Failed to find role: ${roleError.message}`,
      };
    }

    const { data: menuData, error: menuError } = await supabase
      .from("sidebar_menus")
      .select(
        `
        *,
        role_menu_permissions!inner(
          id,
          role_id,
          menu_id,
          can_view,
          can_edit,
          can_delete,
          can_approve,
          created_at
        )
      `
      )
      .eq("is_active", true)
      .eq("role_menu_permissions.role_id", role.id)
      .eq("role_menu_permissions.can_view", true)
      .order("menu_order", { ascending: true });

    if (menuError) {
      return {
        menuItems: [],
        error: `Failed to fetch menus: ${menuError.message}`,
      };
    }

    const menuItems: MenuItem[] = menuData.map((menu: any) => ({
      id: menu.id,
      parent_id: menu.parent_id,
      menu_label: menu.menu_label,
      menu_icon: menu.menu_icon,
      route_path: menu.route_path,
      menu_order: menu.menu_order,
      is_active: menu.is_active,
      requires_permission: menu.requires_permission,
      created_at: menu.created_at,
      updated_at: menu.updated_at,
      permissions: menu.role_menu_permissions[0],
    }));

    const hierarchicalMenus = buildHierarchicalMenus(menuItems);

    return { menuItems: hierarchicalMenus, error: null };
  } catch (error) {
    console.error("[SSR] Error fetching menu permissions:", error);
    return {
      menuItems: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

function buildHierarchicalMenus(menuItems: MenuItem[]): MenuItem[] {
  const menuMap = new Map<string, MenuItem>();
  const rootMenus: MenuItem[] = [];

  menuItems.forEach((menu) => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  menuItems.forEach((menu) => {
    const menuItem = menuMap.get(menu.id)!;

    if (menu.parent_id) {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(menuItem);
      }
    } else {
      rootMenus.push(menuItem);
    }
  });

  return rootMenus;
}
