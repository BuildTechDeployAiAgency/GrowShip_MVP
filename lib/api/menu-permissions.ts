import { createClient } from "@/lib/supabase/client";
import { MenuItem, PermissionLevel } from "@/types/menu";
import { setStoredMenuData } from "@/lib/localStorage";

// Query keys for TanStack Query
export const menuPermissionKeys = {
  all: ["menuPermissions"] as const,
  byRole: (roleId: string) => ["menuPermissions", "role", roleId] as const,
  byUser: (userId: string) => ["menuPermissions", "user", userId] as const,
};

export async function fetchMenuPermissions(roleId: string): Promise<{
  menuItems: MenuItem[];
  error: string | null;
}> {
  try {
    const supabase = createClient();

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .eq("is_active", true)
      .single();

    if (roleError) {
      return {
        menuItems: [],
        error: `Failed to fetch role: ${roleError.message}`,
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
      .eq("role_menu_permissions.role_id", roleId)
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
    console.error("Error fetching menu permissions:", error);
    return {
      menuItems: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function fetchUserMenuPermissions(userId: string): Promise<{
  menuItems: MenuItem[];
  error: string | null;
}> {
  try {
    const supabase = createClient();

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

    const result = await fetchMenuPermissions(role.id);

    // Store menu data to localStorage for instant display on next load
    if (result.menuItems && result.menuItems.length > 0) {
      setStoredMenuData(userId, result.menuItems);
    }

    return result;
  } catch (error) {
    console.error("Error fetching user menu permissions:", error);
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

export function hasMenuPermission(
  menuItems: MenuItem[],
  menuId: string,
  permission: PermissionLevel
): boolean {
  const findMenuWithPermission = (items: MenuItem[]): boolean => {
    for (const item of items) {
      if (item.id === menuId && item.permissions) {
        switch (permission) {
          case "view":
            return item.permissions.can_view;
          case "edit":
            return item.permissions.can_edit;
          case "delete":
            return item.permissions.can_delete;
          case "approve":
            return item.permissions.can_approve;
          default:
            return false;
        }
      }

      if (item.children && findMenuWithPermission(item.children)) {
        return true;
      }
    }
    return false;
  };

  return findMenuWithPermission(menuItems);
}
